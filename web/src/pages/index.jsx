import Layout from "./Layout.jsx";

import Questionnaire from "./Questionnaire";

import Dashboard from "./Dashboard";

import Profile from "./Profile";

import WorkoutSession from "./WorkoutSession";

import History from "./History";

import AdminWorkouts from "./AdminWorkouts";

import AdminUsers from "./AdminUsers";

import VerifyEmail from "./VerifyEmail";

import Home from "./Home";

import Account from "./Account";

import CoachSelection from "./CoachSelection";

import AdminCoaches from "./AdminCoaches";

import AdminPremium from "./AdminPremium";

import Leaderboard from "./Leaderboard";

import Achievements from "./Achievements";

import Buddies from "./Buddies";

import Challenges from "./Challenges";

import MyWorkouts from "./MyWorkouts";

import Community from "./Community";

import FreestyleWorkout from "./FreestyleWorkout";

import FreestyleSetup from "./FreestyleSetup";

import Media from "./Media";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Questionnaire: Questionnaire,
    
    Dashboard: Dashboard,
    
    Profile: Profile,
    
    WorkoutSession: WorkoutSession,
    
    History: History,
    
    AdminWorkouts: AdminWorkouts,
    
    AdminUsers: AdminUsers,
    
    VerifyEmail: VerifyEmail,
    
    Home: Home,
    
    Account: Account,
    
    CoachSelection: CoachSelection,
    
    AdminCoaches: AdminCoaches,
    
    AdminPremium: AdminPremium,
    
    Leaderboard: Leaderboard,
    
    Achievements: Achievements,
    
    Buddies: Buddies,
    
    Challenges: Challenges,
    
    MyWorkouts: MyWorkouts,
    
    Community: Community,
    
    FreestyleWorkout: FreestyleWorkout,
    
    FreestyleSetup: FreestyleSetup,
    
    Media: Media,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Questionnaire />} />
                
                
                <Route path="/Questionnaire" element={<Questionnaire />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/WorkoutSession" element={<WorkoutSession />} />
                
                <Route path="/History" element={<History />} />
                
                <Route path="/AdminWorkouts" element={<AdminWorkouts />} />
                
                <Route path="/AdminUsers" element={<AdminUsers />} />
                
                <Route path="/VerifyEmail" element={<VerifyEmail />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Account" element={<Account />} />
                
                <Route path="/CoachSelection" element={<CoachSelection />} />
                
                <Route path="/AdminCoaches" element={<AdminCoaches />} />
                
                <Route path="/AdminPremium" element={<AdminPremium />} />
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
                <Route path="/Achievements" element={<Achievements />} />
                
                <Route path="/Buddies" element={<Buddies />} />
                
                <Route path="/Challenges" element={<Challenges />} />
                
                <Route path="/MyWorkouts" element={<MyWorkouts />} />
                
                <Route path="/Community" element={<Community />} />
                
                <Route path="/FreestyleWorkout" element={<FreestyleWorkout />} />
                
                <Route path="/FreestyleSetup" element={<FreestyleSetup />} />
                
                <Route path="/Media" element={<Media />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}