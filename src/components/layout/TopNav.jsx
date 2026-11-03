import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function TopNav({ 
  currentUser, 
  currentLang = 'en', 
  onLangChange = () => {}, 
  onOpenProfile = () => {},
  approvalCount = 1,
  isSuperAdminMode = false,
  isSuperAdminEligible = false,
  onToggleSuperAdmin = () => {},
  onSwitchAccount = () => {}
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [timeStr, setTimeStr] = useState('');
  const [locationName, setLocationName] = useState('Kelurahan Benoa, ID');
  const [weatherText, setWeatherText] = useState('⛅ 29°C');
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const locale = currentLang === 'id' ? 'id-ID' : 'en-US';
      const datePart = now.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
      let timePart = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
      timePart = timePart.replace('.', ':');
      setTimeStr(`${datePart} - ${timePart}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [currentLang]);

  // Weather fetch
  useEffect(() => {
    const getWeatherIcon = (code, isDay = 1) => {
      if (code === 0) return isDay ? '☀️' : '🌙';
      if (code === 1 || code === 2) return isDay ? '🌤️' : '⛅';
      if (code === 3) return '☁️';
      if (code === 45 || code === 48) return '🌫️';
      if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
      if ([61, 63, 65, 66, 67].includes(code)) return '🌧️';
      if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
      if ([80, 81, 82].includes(code)) return '🌦️';
      if ([95, 96, 99].includes(code)) return '⛈️';
      return '⛅';
    };

    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=-8.7963&longitude=115.1764&current_weather=true`);
        if (res.ok) {
          const wData = await res.json();
          if (wData?.current_weather) {
            const temp = Math.round(wData.current_weather.temperature);
            const icon = getWeatherIcon(wData.current_weather.weathercode, wData.current_weather.is_day);
            setWeatherText(`${icon} ${temp}°C`);
          }
        }
      } catch (e) {}
    };
    fetchWeather();
  }, []);

  // Debugging log untuk mengecek isi data user di Console Browser
  console.log("Data User TopNav:", currentUser);
  console.log("isSuperAdminEligible prop:", isSuperAdminEligible);

  // Fallback nama dan email
  const userName = currentUser?.Name || currentUser?.name || currentUser?.fullname || 'Guest';
  const userEmail = currentUser?.email || currentUser?.Email || currentUser?.USER_UID || 'Tidak ada email';
  
  // Profile picture strictly from employee_directory column "link"
  const userAvatar = currentUser?.link || currentUser?.Link || currentUser?.photo || currentUser?.avatar || 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png';

  // Validasi nilai "super admin?" dari record currentUser employee_directory
  // Cek apakah nilai eksplisit FALSE
  const rawSuperAdminVal = 
    currentUser?.['super admin?'] ?? 
    currentUser?.['Super Admin?'] ?? 
    currentUser?.['super admin'] ?? 
    currentUser?.['Super Admin'] ?? 
    currentUser?.super_admin;

  console.log("rawSuperAdminVal:", rawSuperAdminVal);

  // LOGIKA DIPERKETAT: Harus benar-benar true atau "true"
  // Abaikan isSuperAdminEligible dari prop jika di database nyata-nyatanya false
  const isSuperAdminDatabase = 
    rawSuperAdminVal === true || 
    String(rawSuperAdminVal).trim().toLowerCase() === 'true';

  // Jika di database false, maka tidak peduli apa kata prop isSuperAdminEligible,
  // isSuperAdmin akan menjadi false.
  const isSuperAdmin = isSuperAdminDatabase;

  const handleLogout = () => {
    localStorage.removeItem('hris_session_data');
    localStorage.removeItem('hris_super_admin_active');
    navigate('/login');
  };

  const handleToggleClick = (e) => {
    const nextVal = e.target.checked;
    if (typeof onToggleSuperAdmin === 'function') {
      onToggleSuperAdmin(nextVal);
    }
  };

  return (
    <nav className="bg-blue-600 p-2 sm:p-4 text-white shadow-md sticky top-0 z-50 w-full transition-all">
      <div className="container mx-auto flex justify-between items-center px-1 sm:px-2">
        
        {/* Brand Logo & Live Widget */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Link to="/" className="flex-shrink-0 group" title="HRIS Portal">
            <img 
              src="/geminilogo.jpg" 
              alt="HRIS Logo" 
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl object-contain shadow-md group-hover:scale-105 transition-transform bg-white border-2 border-white"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://cdn-icons-png.flaticon.com/128/1946/1946488.png";
              }}
            />
          </Link>
          <div className="flex flex-col justify-center min-w-0">
            <Link to="/" className="flex items-center text-white hover:opacity-95 transition">
              <span className="text-xl sm:text-2xl font-black tracking-wider leading-none" style={{ letterSpacing: '-0.02em' }}>
                HRIS
              </span>
            </Link>
            <div className="flex items-center space-x-1 sm:space-x-2 text-blue-100 text-[10px] sm:text-xs mt-1 leading-none whitespace-nowrap overflow-hidden">
              <span className="font-medium tracking-tight truncate">{timeStr || 'Fri, Oct 30 - 10:18'}</span>
              <span className="opacity-50 hidden sm:inline-block">&bull;</span>
              <span className="hidden sm:inline-block truncate max-w-[140px] sm:max-w-none">{locationName}</span>
              <span className="opacity-50">&bull;</span>
              <span className="font-bold tracking-tight shrink-0">{weatherText}</span>
            </div>
          </div>
        </div>

        {/* Right: Language Switch + User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          
          {/* Language Switch */}
          <div className="flex items-center bg-blue-700 rounded-lg p-0.5 text-xs font-semibold border border-blue-500">
            <button 
              onClick={() => onLangChange && onLangChange('en')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition ${currentLang === 'en' ? 'text-white bg-blue-800 shadow-sm' : 'text-blue-200 hover:text-white'}`}
            >
              EN
            </button>
            <button 
              onClick={() => onLangChange && onLangChange('id')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition ${currentLang === 'id' ? 'text-white bg-blue-800 shadow-sm' : 'text-blue-200 hover:text-white'}`}
            >
              ID
            </button>
          </div>

          {/* User Profile Menu with outside click ref */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)} 
              className="relative flex items-center space-x-1 sm:space-x-2 bg-blue-700 hover:bg-blue-800 py-1 sm:py-1.5 px-2 sm:px-3 rounded-xl transition focus:outline-none"
            >
              <div className="relative">
                <img 
                  src={userAvatar} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-inner bg-blue-100" 
                  onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png'; }}
                />
                {approvalCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-blue-700 shadow-sm animate-bounce">
                    {approvalCount}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold hidden sm:inline-block max-w-[150px] truncate">{userName}</span>
              <svg className="w-3.5 h-3.5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 text-gray-700 z-50 animate-fadeIn"
              >
                {/* Header: Logged in as email */}
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium">{currentLang === 'id' ? 'Masuk sebagai' : 'Logged in as'}</p>
                  <p className="text-xs font-bold text-gray-800 truncate mt-0.5">{userEmail}</p>
                </div>

                {/* SUPER ADMIN TOGGLE: Hanya muncul jika isSuperAdmin = true murni dari database */}
                {isSuperAdmin && (
                  <div 
                    className="px-4 py-2.5 border-b border-gray-100 bg-indigo-50/40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        Super Admin
                      </span>
                      
                      {/* Pill toggle switch */}
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={isSuperAdminMode}
                          onChange={handleToggleClick}
                          className="sr-only" 
                        />
                        <div className={`w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${isSuperAdminMode ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out shadow-sm pointer-events-none ${isSuperAdminMode ? 'transform translate-x-5' : ''}`}></div>
                      </label>
                    </div>

                    {/* Switch Account Button */}
                    {isSuperAdminMode && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setDropdownOpen(false);
                          if (typeof onSwitchAccount === 'function') {
                            onSwitchAccount();
                          }
                        }}
                        className="mt-2.5 w-full text-center py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                        </svg>
                        Switch Account
                      </button>
                    )}
                  </div>
                )}

                {/* Approval Menu Item */}
                <Link 
                  to="/leave" 
                  onClick={() => setDropdownOpen(false)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between transition border-b border-gray-50"
                >
                  <div className="flex items-center space-x-2.5">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="font-medium text-gray-700">{currentLang === 'id' ? 'Persetujuan' : 'Approval'}</span>
                  </div>
                  {approvalCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-xs">
                      {approvalCount}
                    </span>
                  )}
                </Link>

                {/* My Profile Menu Item */}
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    if (typeof onOpenProfile === 'function') {
                      onOpenProfile();
                    }
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2.5 transition"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  <span className="font-medium text-gray-700">{currentLang === 'id' ? 'Profil Saya' : 'My Profile'}</span>
                </button>

                {/* Log Out Menu Item */}
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2.5 transition border-t border-gray-100"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  <span className="font-semibold">{currentLang === 'id' ? 'Keluar' : 'Log Out'}</span>
                </button>

              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}