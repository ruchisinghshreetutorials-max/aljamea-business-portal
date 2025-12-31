"use client"
import html2canvas from 'html2canvas'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function AttendancePage() {
  const [className, setClassName] = useState('Class 1')
  const [newName, setNewName] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [report, setReport] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | null>(null)
  
  const [staffId, setStaffId] = useState('')
  const [selectedRole, setSelectedRole] = useState('teacher')
  const [selectedStudent, setSelectedStudent] = useState('');
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [studentSummary, setStudentSummary] = useState<any[]>([]);

  // Update Page Title
  useEffect(() => {
    document.title = "Aljamea Business School Portal";
  }, []);

  async function checkRoleAndFetchData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setUserRole(profile?.role || 'teacher')
      }
      const { data: studentData } = await supabase.from('students').select('*').order('name', { ascending: true })
      setStudents(studentData || [])
      const today = new Date().toISOString().split('T')[0]
      const { data: attendanceData } = await supabase.from('attendance').select(`id, status, student_id, date, students!student_id ( name )`).eq('date', today)
      setReport(attendanceData || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { checkRoleAndFetchData() }, [])

  async function deleteStudent(id: any, name: string) {
    if (userRole !== 'admin') return alert("Only admins can delete students");
    if (!confirm(`Are you sure you want to permanently delete ${name}?`)) return

    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) alert("Error deleting student: " + error.message)
    else checkRoleAndFetchData()
  }

  async function updateStaffRole() {
    if (userRole !== 'admin') return alert("Only admins can manage staff")
    const { error } = await supabase.from('profiles').upsert({ id: staffId, role: selectedRole })
    if (error) alert(error.message); else { alert("Staff Role Updated!"); setStaffId(''); }
  }

  async function generateStudentReport() {
    if (!selectedStudent) return alert("Please select a student first");
    let startDate = new Date();
    if (reportType === 'weekly') startDate.setDate(startDate.getDate() - 7);
    else if (reportType === 'monthly') startDate.setMonth(startDate.getMonth() - 1);
    else startDate.setHours(0,0,0,0);

    const { data } = await supabase.from('attendance').select('date, status').eq('student_id', selectedStudent).gte('date', startDate.toISOString().split('T')[0]);
    setStudentSummary(data || []);
  }

  async function addStudent() {
    if (userRole !== 'admin') return;
    if (!newName.trim()) return alert("Enter student name");
    await supabase.from('students').insert([{ name: newName, roll_number: "ALJ-" + Math.floor(100 + Math.random() * 900) }])
    setNewName(''); checkRoleAndFetchData()
  }

  async function markAttendance(studentId: any, status: string) {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('attendance').insert([{ student_id: studentId, status: status, date: today }])
    checkRoleAndFetchData()
  }

  async function clearTodaysAttendance() {
    if (userRole !== 'admin') return
    if (!confirm("Clear all attendance for today?")) return
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('attendance').delete().eq('date', today)
    checkRoleAndFetchData()
  }

  const exportElementAsImage = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId)
    if (!element) return
    const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2 })
    const link = document.createElement('a')
    link.href = canvas.toDataURL("image/png"); link.download = fileName; link.click()
  }

  if (loading) return <p style={{ textAlign: 'center', padding: '50px' }}>Loading Aljamea Portal...</p>

  return (
    <div style={{ padding: '20px 10px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        <div style={{ textAlign: 'right', marginBottom: '10px' }}>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} style={{ fontSize: '12px', background: 'none', border: 'none', textDecoration: 'underline', color: '#64748b', cursor: 'pointer' }}>Logout</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
          <img src="/aljamea-logo.png" alt="Logo" style={{ maxWidth: '180px', height: 'auto', display: 'block' }} />
        </div>

        <h2 style={{ textAlign: 'center', color: '#1e293b', marginBottom: '20px' }}>Aljamea Business School</h2>

        {userRole === 'admin' && (
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: '#f1f5f9', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#475569' }}>Admin: Add Student</h4>
              <div style={{ display: 'flex', gap: '5px' }}>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Student Name" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <button onClick={addStudent} style={{ padding: '10px 15px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Add</button>
              </div>
            </div>

            <div style={{ padding: '15px', backgroundColor: '#fef3c7', borderRadius: '12px', border: '1px solid #f59e0b' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#b45309' }}>Admin: Manage Staff Permissions</h4>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <input value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="User UID" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={updateStaffRole} style={{ padding: '10px 15px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Update</button>
              </div>
            </div>
          </div>
        )}

        <select value={className} onChange={(e) => setClassName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #cbd5e1' }}>
          <option value="Class 1">Class 1</option>
          <option value="Class 2">Class 2</option>
          <option value="Class 3">Class 3</option>
        </select>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Mark Attendance</h3>
          {students.map(s => {
            const marked = report.find(r => r.student_id === s.id);
            return (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: '500' }}>{s.name}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button disabled={!!marked} onClick={() => markAttendance(s.id, 'Present')} style={{ backgroundColor: marked?.status === 'Present' ? '#dcfce7' : '#f1f5f9', color: marked?.status === 'Present' ? '#166534' : '#64748b', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold' }}>P</button>
                  <button disabled={!!marked} onClick={() => markAttendance(s.id, 'Absent')} style={{ backgroundColor: marked?.status === 'Absent' ? '#fee2e2' : '#f1f5f9', color: marked?.status === 'Absent' ? '#991b1b' : '#64748b', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold' }}>A</button>
                  {userRole === 'admin' && (
                    <button onClick={() => deleteStudent(s.id, s.name)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', padding: '0 5px' }}>🗑️</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div id="daily-report" style={{ padding: '20px', border: '1px solid #f1f5f9', textAlign: 'center', backgroundColor: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <img src="/aljamea-logo.png" style={{ maxWidth: '140px' }} />
          </div>
          <h3 style={{ color: '#0ea5e9', margin: '10px 0' }}>{className} Attendance</h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>{new Date().toLocaleDateString('en-GB')}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <tbody>
              {report.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ textAlign: 'left', padding: '8px', fontSize: '14px' }}>{r.students?.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: r.status === 'Present' ? '#16a34a' : '#dc2626' }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => exportElementAsImage('daily-report', 'Daily_Attendance.png')} style={{ width: '100%', padding: '16px', backgroundColor: '#25d366', color: 'white', border: 'none', borderRadius: '12px', marginTop: '15px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>📸 Download Daily Report</button>

        {userRole === 'admin' && (
          <button onClick={clearTodaysAttendance} style={{ width: '100%', marginTop: '20px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer' }}>
            Reset Today's Attendance Records
          </button>
        )}

        <div style={{ marginTop: '50px', padding: '25px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '15px' }}>Student Performance History</h3>
          <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <option value="">Select Student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            {['daily', 'weekly', 'monthly'].map(t => (
              <button key={t} onClick={() => setReportType(t as any)} style={{ flex: 1, padding: '12px', backgroundColor: reportType === t ? '#1e293b' : 'white', color: reportType === t ? 'white' : '#64748b', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold', textTransform: 'capitalize' }}>{t}</button>
            ))}
          </div>
          <button onClick={generateStudentReport} style={{ width: '100%', padding: '14px', backgroundColor: '#0ea5e9', color: 'white', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Generate Summary</button>

          <div id="student-report-card" style={{ padding: '25px', textAlign: 'center', marginTop: '20px', border: '1px solid #f1f5f9', backgroundColor: 'white', borderRadius: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}><img src="/aljamea-logo.png" style={{ maxWidth: '120px' }} /></div>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>{students.find(s => s.id === selectedStudent)?.name || "Student Summary"}</h4>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '15px' }}>{reportType.toUpperCase()} ATTENDANCE REPORT</p>
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
              <div><b style={{ color: '#16a34a', fontSize: '22px' }}>{studentSummary.filter(r => r.status === 'Present').length}</b><br/><small style={{ color: '#64748b' }}>PRESENT</small></div>
              <div><b style={{ color: '#dc2626', fontSize: '22px' }}>{studentSummary.filter(r => r.status === 'Absent').length}</b><br/><small style={{ color: '#64748b' }}>ABSENT</small></div>
              <div>
                <b style={{ fontSize: '22px', color: '#1e293b' }}>{studentSummary.length > 0 ? Math.round((studentSummary.filter(r => r.status === 'Present').length / studentSummary.length) * 100) : 0}%</b>
                <br/><small style={{ color: '#64748b' }}>PERCENT</small>
              </div>
            </div>
          </div>
          <button onClick={() => exportElementAsImage('student-report-card', 'Student_Summary.png')} style={{ width: '100%', padding: '16px', backgroundColor: '#25d366', color: 'white', border: 'none', borderRadius: '12px', marginTop: '15px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>📸 Download Summary for WhatsApp</button>
        </div>

      </div>
    </div>
  )
}