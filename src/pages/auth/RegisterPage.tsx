import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSessionStore } from '../../stores/session.store.ts';
import { ROLE_HOME_PATHS } from '../../lib/permissions.ts';
import { User, Mail, Lock, Building, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const { loginWithCredentials } = useSessionStore();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    academicLink: 'Docente planta',
    academicProgram: 'Ingeniería Ambiental y Bioprocesos',
    researchGroup: 'Grupo de Investigación en Biotecnología Aplicada',
  });
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In registration always sets role to researcher (Section 2.2)
    await loginWithCredentials(formData.email, formData.password);
    setIsSuccess(true);
    setTimeout(() => {
      navigate(ROLE_HOME_PATHS.researcher || '/requests', { replace: true });
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-[#14281D]">Researcher Registration</h2>
        <p className="text-xs text-stone-500">
          Create your institutional account to file research projects and requests
        </p>
      </div>

      {isSuccess ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Account created successfully! Redirecting to my requests...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-stone-400" size={16} />
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] focus:ring-1 focus:ring-[#14281D] outline-none"
                placeholder="Dr. Carmen Lucia Morales"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-stone-400" size={16} />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] focus:ring-1 focus:ring-[#14281D] outline-none"
                placeholder="researcher@university.edu"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Institutional Link
              </label>
              <select
                value={formData.academicLink}
                onChange={(e) => setFormData({ ...formData, academicLink: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white"
              >
                <option value="Docente planta">Tenured Faculty</option>
                <option value="Docente ocasional">Adjunct Faculty</option>
                <option value="Estudiante de posgrado">Graduate Student</option>
                <option value="Estudiante de pregrado">Undergraduate Student</option>
                <option value="Monitor de investigación">Research Assistant</option>
                <option value="Personal administrativo">Administrative Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-stone-400" size={16} />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Academic Program / Department
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-2.5 text-stone-400" size={16} />
              <input
                type="text"
                required
                value={formData.academicProgram}
                onChange={(e) => setFormData({ ...formData, academicProgram: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none"
                placeholder="Faculty of Engineering / Basic Sciences"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Research Group
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-2.5 text-stone-400" size={16} />
              <input
                type="text"
                required
                value={formData.researchGroup}
                onChange={(e) => setFormData({ ...formData, researchGroup: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] outline-none"
                placeholder="Applied Biotechnology Research Group"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-2.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <span>Create Researcher Account</span>
          </button>
        </form>
      )}

      <div className="pt-2 text-center text-xs text-stone-500">
        Already have an institutional account?{' '}
        <Link to="/login" className="font-bold text-[#14281D] hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
