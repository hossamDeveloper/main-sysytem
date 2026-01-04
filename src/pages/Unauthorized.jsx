import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';

export function Unauthorized() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page.
        </p>
        {user && (
          <p className="text-sm text-gray-500 mb-6">
            Your current role: <span className="font-semibold">{user.role}</span>
          </p>
        )}
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

