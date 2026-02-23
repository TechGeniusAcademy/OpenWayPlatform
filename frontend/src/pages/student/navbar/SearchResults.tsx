import React from "react";
import { useLocation, Link } from "react-router-dom";
import { COURSES } from "./data/Courses";

function SearchResults() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const query = params.get("query")?.toLowerCase() || "";

  const results = COURSES.filter(
    (course) =>
      course.title.toLowerCase().includes(query) ||
      course.description.toLowerCase().includes(query)
  );

  return (
    <div style={{ padding: "20px" }}>
      <h2>Результаты поиска для: "{query}"</h2>

      {results.length === 0 ? (
        <p>Ничего не найдено</p>
      ) : (
        <ul>
          {results.map((course) => (
            <li key={course.id}>
              <Link to={course.link}>{course.title} — {course.description}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchResults;
