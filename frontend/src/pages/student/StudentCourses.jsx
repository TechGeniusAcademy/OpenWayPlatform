function StudentCourses() {
  return (
    <div className="student-page">
      <div className="page-header">
        <h1>Курсы</h1>
        <p>Учебные материалы и курсы</p>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">📚</div>
        <h3>Курсы пока недоступны</h3>
        <p>Функционал курсов будет добавлен позже</p>
      </div>
    </div>
  );
}

export default StudentCourses;
