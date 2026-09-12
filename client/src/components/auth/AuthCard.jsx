import React, { useState } from 'react';
import { User, Lock, Mail, Shield, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const AuthCard = ({ currentToken, currentUser }) => {
  const [rbacResult, setRbacResult] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState(null);

  // Quick helper to test access permissions with active token
  const testAccess = async (endpointName) => {
    if (!currentToken) return;
    setTestingEndpoint(endpointName);
    setRbacResult(null);
    try {
      const res = await api.get(`/auth/${endpointName}`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      setRbacResult({
        success: true,
        endpoint: endpointName,
        message: `${res.message || 'Access granted'} (Status: 200 OK)`,
      });
    } catch (err) {
      setRbacResult({
        success: false,
        endpoint: endpointName,
        message: `${err.message || 'Access denied'} (Status: ${err.status || 403})`,
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Shield className="w-5 h-5 text-brand-400" />
            <span>Account Verification & Role Access</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            JWT authenticated session with role-based security: Student (Candidates) and Admin (Platform Administrators).
          </p>
        </div>
      </div>

      {currentUser && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-semibold">
                Logged in as {currentUser.name} ({currentUser.email})
              </span>
            </div>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
              Role: {currentUser.role}
            </span>
          </div>

          <div className="pt-2 border-t border-emerald-500/20 text-xs text-slate-300 space-y-2">
            <p className="font-semibold text-slate-200">Test API Role Authorization:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => testAccess('student-area')}
                disabled={Boolean(testingEndpoint)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
              >
                {testingEndpoint === 'student-area' ? 'Checking...' : 'Check /api/auth/student-area (Student & Admin)'}
              </button>
              <button
                onClick={() => testAccess('admin-area')}
                disabled={Boolean(testingEndpoint)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
              >
                {testingEndpoint === 'admin-area' ? 'Checking...' : 'Check /api/auth/admin-area (Admin Only)'}
              </button>
            </div>

            {rbacResult && (
              <div
                className={`p-2.5 rounded-lg text-xs font-mono mt-2 border ${
                  rbacResult.success
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                }`}
              >
                [{rbacResult.endpoint}] → {rbacResult.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthCard;
