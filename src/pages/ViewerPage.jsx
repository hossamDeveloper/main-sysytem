import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { useCurrentUser } from '../services/userApi';

export function ViewerPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state) => state.auth);
  const { data: currentUser, isLoading } = useCurrentUser(token);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const displayUser = currentUser || user;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Viewer Dashboard</h1>
              {isLoading ? (
                <p className="text-gray-600">Loading user data...</p>
              ) : (
                <p className="text-gray-600">
                  Welcome, {displayUser?.name} ({displayUser?.email})
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded">
              <h2 className="font-semibold text-gray-800 mb-2">Viewer Privileges</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>View all content</li>
                <li>Read documents</li>
                <li>Access reports</li>
                <li>View statistics</li>
                <li>No editing permissions</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Viewed</h3>
                <p className="text-3xl font-bold text-blue-600">1,234</p>
                <p className="text-sm text-blue-600 mt-1">Documents viewed</p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Favorites</h3>
                <p className="text-3xl font-bold text-green-600">45</p>
                <p className="text-sm text-green-600 mt-1">Saved items</p>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">This Week</h3>
                <p className="text-3xl font-bold text-purple-600">67</p>
                <p className="text-sm text-purple-600 mt-1">Recent views</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

