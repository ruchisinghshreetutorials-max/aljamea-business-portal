"use client"
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function AttendancePage() {
  const [className, setClassName] = useState('Class 1')
  const [newName, setNewName] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [report, setReport] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | null>(null)
  
  // States for the missing Summary features
  const [selectedStudent, setSelectedStudent] = useState('')
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [studentSummary, setStudentSummary] = useState<any>(null)

  useEffect(() => {
    document.title = "Aljamea Business School Portal";
    checkRoleAndFetchData();
  }, [])

  async function checkRoleAndFetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUserRole(profile?.role || 'teacher')
    }
    const { data: studentData } = await supabase.from('students').select('*').order('name', { ascending: true })
    setStudents(studentData || [])
    
    const today = new Date().toISOString().split('T')[0]
    const { data: attendanceData } = await supabase.from('attendance').select(`id, status, student_id, date, students ( name )`).eq('date', today)
    setReport(attendanceData || [])
    setLoading(false)
  }

  async function generateStudentReport() {
    if (!selectedStudent) return alert("Please select a student first")
    
    const now = new Date()
    let startDate = new Date()
    if (reportType === 'weekly') startDate.setDate(now.getDate() - 7)
    else startDate.setMonth(now.getMonth() - 1)

    const { data } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', selectedStudent)
      .gte('date', startDate.toISOString().split('T')[0])

    if (data) {
      const present = data.filter(r => r.status === 'Present').length
      const total = data.length
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0
      
      const studentName = students.find(s => s.id === selectedStudent)?.name
      setStudentSummary({ name: studentName, present, total, percentage })
    }
  }

  const exportElementAsImage = async (elementId: string, fileName: string) => {
    const html2canvas = (await import('html2canvas')).default
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
        
        {/* Branding */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          <img src="/aljamea-logo.png" alt="Logo" style={{ maxWidth: '150px' }} />
        </div>
        <h2 style={{ textAlign: 'center', color: '#1e293b', marginBottom: '20px' }}>Aljamea Business School</h2>

        {/* Admin Section */}
        {userRole === 'admin' && (
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Admin: Add Student</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Student Name" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <button onClick={async () => {
                 await supabase.from('students').insert([{ name: newName }]);
                 setNewName(''); checkRoleAndFetchData();
              }} style={{ padding: '10px 20px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px' }}>Add</button>
            </div>
          </div>
        )}

        {/* Attendance Marking List (Students appear here) */}
        <div style={{ marginBottom: '30px' }}>
          {students.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <span>{s.name}</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={async () => {
                  await supabase.from('attendance').insert([{ student_id: s.id, status: 'Present', date: new Date().toISOString().split('T')[0] }]);
                  checkRoleAndFetchData();
                }} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#dcfce7', color: '#166534' }}>P</button>
                <button onClick={async () => {
                  await supabase.from('attendance').insert([{ student_id: s.id, status: 'Absent', date: new Date().toISOString().split('T')[0] }]);
                  checkRoleAndFetchData();
                }} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#fee2e2', color: '#991b1b' }}>A</button>
              </div>
            </div>
          ))}
        </div>

        {/* SECTION 1: DAILY REPORT */}
        <div id="daily-report-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '20px' }}>
          <h3 style={{ textAlign: 'center', margin: '0 0 15px 0' }}>Daily Attendance Report</h3>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: '14px', color: '#64748b' }}><th>Student</th><th style={{ textAlign: 'right' }}>Status</th></tr>
            </thead>
            <tbody>
              {report.map(r => (
                <tr key={r.id} style={{ height: '35px' }}>
                  <td>{r.students?.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: r.status === 'Present' ? '#166534' : '#991b1b' }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => exportElementAsImage('daily-report-card', 'Daily_Report.png')} style={{ width: '100%', padding: '12px', backgroundColor: '#25d366', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginBottom: '40px' }}>Download Daily Report</button>

        {/* SECTION 2: STUDENT PERFORMANCE HISTORY */}
        <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>Student Performance History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="">Select a Student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setReportType('weekly')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: reportType === 'weekly' ? '#1e293b' : 'white', color: reportType === 'weekly' ? 'white' : 'black' }}>Weekly</button>
              <button onClick={() => setReportType('monthly')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: reportType === 'monthly' ? '#1e293b' : 'white', color: reportType === 'monthly' ? 'white' : 'black' }}>Monthly</button>
            </div>
            <button onClick={generateStudentReport} style={{ padding: '12px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Generate Summary</button>
          </div>

          {studentSummary && (
            <div id="history-card" style={{ padding: '25px', backgroundColor: '#f8fafc', borderRadius: '15px', border: '2px solid #0ea5e9', textAlign: 'center' }}>
              <img src="/aljamea-logo.png" alt="Logo" style={{ maxWidth: '100px', marginBottom: '10px' }} />
              <h4 style={{ margin: '0' }}>{studentSummary.name}</h4>
              <p style={{ color: '#64748b' }}>{reportType === 'weekly' ? 'Last 7 Days' : 'Last 30 Days'}</p>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#0ea5e9', margin: '15px 0' }}>{studentSummary.percentage}%</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', color: '#475569' }}>
                <span>Present: <b>{studentSummary.present}</b></span>
                <span>Total Days: <b>{studentSummary.total}</b></span>
              </div>
              <button onClick={() => exportElementAsImage('history-card', 'Student_Summary.png')} style={{ marginTop: '20px', width: '100%', padding: '10px', backgroundColor: '#25d366', color: 'white', border: 'none', borderRadius: '8px' }}>Download for WhatsApp</button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}