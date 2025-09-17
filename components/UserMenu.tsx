import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';

interface UserMenuProps {
    user: User;
    onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-accent"
                aria-label="User menu"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            </button>

            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-56 bg-secondary border border-secondary rounded-md shadow-lg py-1 z-50"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                >
                    <div className="px-4 py-3 border-b border-primary/20">
                        <p className="text-sm font-medium text-primary truncate" role="none">{user.name}</p>
                        <p className="text-xs text-secondary truncate" role="none">{user.email}</p>
                    </div>
                    <button
                        onClick={() => {
                            onLogout();
                            setIsOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-hover"
                        role="menuitem"
                    >
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
