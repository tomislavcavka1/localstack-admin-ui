import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import SQSAdmin from './admin/SQSAdmin';
import SNSAdmin from './admin/SNSAdmin';
import Dashboard from './dashboard/Dashboard';

function App() {
  return (
    <Router>
      <div className="container mt-5">
        <nav className="navbar navbar-expand-lg navbar-light bg-light mb-4">
          <Link className="navbar-brand" to="/">AWS Admin UI</Link>
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav mr-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/">Dashboard</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/sqs-admin">SQS Admin</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/sns-admin">SNS Admin</Link>
              </li>
            </ul>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sqs-admin" element={<SQSAdmin />} />
          <Route path="/sns-admin" element={<SNSAdmin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;