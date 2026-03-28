import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Authentication from "./pages/Authentication.jsx";
import VideoMeet from "./pages/VideoMeet.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import PrivateRoute from "./pages/PrivateRoute.jsx";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Home - protected */}
          <Route path="/" element={
            <PrivateRoute>
              <LandingPage />
            </PrivateRoute>
          }/>

          {/* Auth - public */}
          <Route path="/auth" element={<Authentication />} />

          {/* Meeting - protected */}
         <Route path="/meeting/:roomId" element={
  <PrivateRoute>
    <VideoMeet />
  </PrivateRoute>
}/>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;