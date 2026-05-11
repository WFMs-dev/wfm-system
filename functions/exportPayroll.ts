import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { start_date, end_date, employee_ids, team, department } = body;

    if (!start_date || !end_date) {
      return Response.json({ error: 'start_date and end_date are required' }, { status: 400 });
    }

    // Fetch attendance logs in date range
    const attendanceLogs = await base44.asServiceRole.entities.AttendanceLog.list();
    const schedules = await base44.asServiceRole.entities.Schedule.list();
    const leaveRequests = await base44.asServiceRole.entities.LeaveRequest.list();
    const employees = await base44.asServiceRole.entities.Employee.list();
    const shifts = await base44.asServiceRole.entities.Shift.list();

    const startDt = new Date(start_date);
    const endDt = new Date(end_date);

    // Filter by date range and employee filters
    let filteredEmployees = employees.filter((e: any) => e.status === 'Active');
    if (employee_ids && employee_ids.length > 0) {
      filteredEmployees = filteredEmployees.filter((e: any) => employee_ids.includes(e.id));
    }
    if (team) {
      filteredEmployees = filteredEmployees.filter((e: any) => e.team === team);
    }
    if (department) {
      filteredEmployees = filteredEmployees.filter((e: any) => e.department === department);
    }

    const rows: any[] = [];

    for (const emp of filteredEmployees) {
      const empLogs = attendanceLogs.filter((log: any) => {
        if (log.employee_id !== emp.id) return false;
        const logDate = new Date(log.clock_in_time);
        return logDate >= startDt && logDate <= endDt;
      });

      const empLeaves = leaveRequests.filter((lr: any) => {
        if (lr.employee_id !== emp.id || lr.status !== 'Approved') return false;
        const leaveStart = new Date(lr.start_date);
        const leaveEnd = new Date(lr.end_date);
        return leaveStart <= endDt && leaveEnd >= startDt;
      });

      const totalHours = empLogs.reduce((sum: number, log: any) => sum + (log.total_hours || 0), 0);
      const otHours = empLogs.reduce((sum: number, log: any) => sum + (log.ot_hours || 0), 0);
      const lateCount = empLogs.filter((log: any) => log.status === 'Late').length;
      const absentCount = empLogs.filter((log: any) => log.status === 'Absent').length;

      const sickDays = empLeaves.filter((lr: any) => lr.leave_type_id && lr.leave_type_code === 'SICK').reduce((s: number, lr: any) => s + (lr.total_days || 0), 0);
      const vacationDays = empLeaves.filter((lr: any) => lr.leave_type_code === 'VACATION').reduce((s: number, lr: any) => s + (lr.total_days || 0), 0);
      const personalDays = empLeaves.filter((lr: any) => lr.leave_type_code === 'PERSONAL').reduce((s: number, lr: any) => s + (lr.total_days || 0), 0);

      rows.push({
        employee_code: emp.employee_code || '',
        full_name: emp.full_name,
        department: emp.department || '',
        team: emp.team || '',
        location: emp.location || '',
        period_start: start_date,
        period_end: end_date,
        total_work_hours: totalHours.toFixed(2),
        ot_hours: otHours.toFixed(2),
        sick_leave_days: sickDays,
        personal_leave_days: personalDays,
        vacation_days: vacationDays,
        late_count: lateCount,
        absent_count: absentCount,
        status: emp.status,
      });
    }

    // Generate CSV
    const headers = [
      'Employee Code', 'Full Name', 'Department', 'Team', 'Location',
      'Period Start', 'Period End', 'Total Work Hours', 'OT Hours',
      'Sick Leave Days', 'Personal Leave Days', 'Vacation Days',
      'Late Count', 'Absent Count', 'Status'
    ];

    const csvLines = [
      headers.join(','),
      ...rows.map(row => [
        row.employee_code, row.full_name, row.department, row.team, row.location,
        row.period_start, row.period_end, row.total_work_hours, row.ot_hours,
        row.sick_leave_days, row.personal_leave_days, row.vacation_days,
        row.late_count, row.absent_count, row.status
      ].map(v => `"${v}"`).join(','))
    ];

    const csv = csvLines.join('\n');

    // Save export job record
    await base44.asServiceRole.entities.ExportJob.create({
      export_type: 'Payroll',
      start_date,
      end_date,
      status: 'Completed',
      file_name: `payroll_export_${start_date}_${end_date}.csv`,
      requested_by_id: user.id,
      record_count: rows.length,
    });

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payroll_export_${start_date}_${end_date}.csv"`,
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
