import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout = () => {
    // The Header is rendered inside specific pages if they need custom actions, 
    // OR we render a default Header here if no actions needed.
    // However, since VoiceBot needs specific actions in the header, 
    // and other pages might not, it's better to let pages render the Header 
    // OR have Layout accept a prop. 
    // BUT 'Outlet' renders the child route, we can't easily pass props up from child to layout without context.

    // DECISION: 
    // To keep it simple and clean:
    // We will NOT put the Header in the Layout. 
    // Each Page will render the Header component. 
    // This allows VoiceBot to pass its specific actions (Export, Clear) to the Header,
    // while other pages pass nothing.

    // So Layout just handles the background and structural container.
    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 relative overflow-hidden font-sans selection:bg-blue-500/30">
            {/* Background Decor - Common across all pages */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-30 animate-pulse pointer-events-none"></div>
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl opacity-30 animate-pulse delay-1000 pointer-events-none"></div>

            <Outlet />
        </div>
    );
};

export default Layout;
