import { useState, useEffect, FormEvent } from 'react';
import {
  Users,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  ChevronRight,
  UserPlus,
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  Loader2,
  Lock,
  LogOut,
  Tag,
  Key,
  Menu,
  X
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Volunteer = {
  id: number;
  name: string;
  username: string;
  phone: string;
  roles: string;
  temp_password?: string;
};

type Service = {
  id: number;
  name: string;
  date: string;
  time: string;
  is_published?: boolean;
};

type Assignment = {
  id: number;
  service_id: number;
  volunteer_id: number;
  role: string;
  status: 'pendente' | 'confirmado' | 'negado';
  volunteer_name: string;
  service_name: string;
  service_date: string;
};

type Role = {
  id: number;
  name: string;
};

type Availability = {
  id: number;
  volunteer_id: number;
  volunteer_name?: string;
  date: string;
  notes: string;
};

type Profile = {
  id: string; // uuid
  email: string;
  is_approved: boolean;
  volunteer_id: number | null;
};


const parseLocalDate = (dateString: string) => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'volunteer' | null>(null);
  const [volunteerId, setVolunteerId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [view, setView] = useState<'dashboard' | 'volunteers' | 'register-volunteer' | 'services' | 'assignments' | 'roles' | 'profile' | 'availability' | 'reports'>('dashboard');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);

  // Form states
  const [newVolunteer, setNewVolunteer] = useState({ name: '', username: '', phone: '', roles: '', password: '' });
  const [newService, setNewService] = useState({ name: '', date: '', time: '' });
  const [newAssignment, setNewAssignment] = useState({ service_id: 0, volunteer_id: 0, role: '' });
  const [newRole, setNewRole] = useState({ name: '' });
  const [newAvailability, setNewAvailability] = useState({ date: '', notes: '' });
  const [registerError, setRegisterError] = useState('');

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Mobile menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Filter states
  const [filterDate, setFilterDate] = useState('');
  const [filterVolunteerId, setFilterVolunteerId] = useState('');

  useEffect(() => {
    // Check for saved custom session
    const savedUser = localStorage.getItem('vScaleUser');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setIsAuthenticated(true);
      setUserRole(userData.role);
      setVolunteerId(userData.volunteerId);
    } else {
      setIsAuthenticated(false);
    }
  }, []);
  useEffect(() => {
    if (isAuthenticated && userRole) {
      fetchData();
    }
  }, [isAuthenticated, userRole]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Hardcoded admin bypass
    if ((username === 'eleodir.fotografia' && password === '9182735') ||
      (username === 'admin' && password === 'admin@123')) {
      const userData = { username: username, role: 'admin', volunteerId: 0 };
      if (rememberMe) localStorage.setItem('vScaleUser', JSON.stringify(userData));
      setIsAuthenticated(true);
      setUserRole('admin');
      setVolunteerId(0);
      setView('dashboard');
      return;
    }

    // Custom login logic using volunteers table for regular users
    const { data: volunteer, error } = await supabase
      .from('volunteers')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !volunteer) {
      setLoginError('Usuário não encontrado');
    } else if (volunteer.temp_password !== password) {
      setLoginError('Senha incorreta');
    } else {
      let role: 'admin' | 'volunteer' = 'volunteer';
      if (volunteer.roles && volunteer.roles.includes('admin')) {
        role = 'admin';
      }

      const userData = {
        username: volunteer.username,
        role: role,
        volunteerId: volunteer.id
      };

      if (rememberMe) {
        localStorage.setItem('vScaleUser', JSON.stringify(userData));
      }

      setIsAuthenticated(true);
      setUserRole(role);
      setVolunteerId(volunteer.id);
      setView('dashboard');
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('vScaleUser');
    setIsAuthenticated(false);
    setUserRole(null);
    setVolunteerId(null);
    setUsername('');
    setPassword('');
    setView('dashboard');
  };

  const fetchData = async () => {
    const { data: volunteersData, error: volunteersError } = await supabase.from('volunteers').select('*');
    if (volunteersError) console.error('Error fetching volunteers:', volunteersError);
    else setVolunteers(volunteersData || []);

    const { data: servicesData, error: servicesError } = await supabase.from('services').select('*');
    if (servicesError) console.error('Error fetching services:', servicesError);
    else setServices(servicesData || []);

    const { data: assignmentsData, error: assignmentsError } = await supabase.from('assignments').select('*');
    if (assignmentsError) console.error('Error fetching assignments:', assignmentsError);
    else setAssignments(assignmentsData || []);

    const { data: rolesData, error: rolesError } = await supabase.from('roles').select('*');
    if (rolesError) console.error('Error fetching roles:', rolesError);
    else setRoles(rolesData || []);

    const { data: availabilityData, error: availabilityError } = await supabase.from('availability').select('*');
    if (availabilityError) console.error('Error fetching availability:', availabilityError);
    else setAvailability(availabilityData || []);

    // Profiles logic removed for custom login flow
  };

  const toggleAvailability = async (serviceDate: string, currentAv: Availability | undefined) => {
    if (currentAv) {
      const { error } = await supabase.from('availability').delete().match({ id: currentAv.id });
      if (error) console.error('Error deleting availability:', error);
    } else {
      if (!volunteerId) return;
      const { error } = await supabase.from('availability').insert([{
        date: serviceDate,
        notes: '',
        volunteer_id: volunteerId
      }]);
      if (error) console.error('Error adding availability:', error);
    }
    fetchData();
  };

  const handleDeleteAvailability = async (id: number) => {
    const { error } = await supabase.from('availability').delete().match({ id });
    if (error) console.error('Error deleting availability:', error);
    else fetchData();
  };

  const handleAddRole = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('roles').insert([newRole]);
    if (error) alert(error.message);
    else {
      setNewRole({ name: '' });
      fetchData();
    }
  };

  const handlePublishService = async (id: number) => {
    try {
      const { error } = await supabase.from('services').update({ is_published: true }).eq('id', id);
      if (error) throw error;
      setServices(services.map(s => s.id === id ? { ...s, is_published: true } : s));
    } catch (error) {
      console.error('Error publishing service:', error);
      alert('Erro ao publicar serviço.');
    }
  };

  const handleAddVolunteer = async (e: FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    const { data, error } = await supabase
      .from('volunteers')
      .insert([{
        name: newVolunteer.name,
        username: newVolunteer.username,
        phone: newVolunteer.phone,
        roles: newVolunteer.roles,
        temp_password: newVolunteer.password
      }]);

    if (error) {
      setRegisterError('Erro ao criar voluntário: ' + error.message);
      return;
    }

    setNewVolunteer({ name: '', username: '', phone: '', roles: '', password: '' });
    fetchData();
    alert('Voluntário cadastrado com sucesso! O acesso está liberado imediatamente.');
  };

  const handleUpdateVolunteer = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingVolunteer) return;
    const { error } = await supabase.from('volunteers').update(editingVolunteer).match({ id: editingVolunteer.id });
    if (error) setRegisterError(error.message);
    else {
      setEditingVolunteer(null);
      fetchData();
    }
  };

  const handleResetPassword = async (id: number) => {
    const newPassword = window.prompt("Digite a nova senha para este voluntário:");
    if (!newPassword || newPassword.trim() === '') return;

    const { error } = await supabase.from('volunteers').update({ temp_password: newPassword }).match({ id });
    if (error) {
      alert('Erro ao resetar senha: ' + error.message);
    } else {
      alert('Senha resetada com sucesso! O voluntário já pode acessar com a nova senha.');
      fetchData();
    }
  };

  const handleAddService = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('services').insert([newService]);
    if (error) console.error('Error adding service:', error);
    else {
      setNewService({ name: '', date: '', time: '' });
      fetchData();
    }
  };

  const handleAddAssignment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAssignment.service_id || !newAssignment.volunteer_id || !newAssignment.role) return;

    const isAlreadyAssigned = assignments.some(
      a => a.service_id === newAssignment.service_id && a.volunteer_id === newAssignment.volunteer_id
    );

    if (isAlreadyAssigned) {
      alert('Este voluntário já está escalado para este serviço.');
      return;
    }

    const { error } = await supabase.from('assignments').insert([newAssignment]);
    if (error) console.error('Error adding assignment:', error);
    else {
      setNewAssignment({ service_id: newAssignment.service_id, volunteer_id: 0, role: '' });
      fetchData();
    }
  };
  const handleUpdateAssignmentStatus = async (id: number, status: 'confirmado' | 'negado') => {
    const { error } = await supabase
      .from('assignments')
      .update({ status })
      .eq('id', id);

    if (error) console.error('Error updating status:', error);
    else fetchData();
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    if (!volunteerId) {
      setPasswordError('Usuário não identificado.');
      return;
    }

    const { error } = await supabase
      .from('volunteers')
      .update({ temp_password: newPassword })
      .eq('id', volunteerId);

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    }
  };

  const deleteItem = async (type: string, id: number) => {
    const { error } = await supabase.from(type).delete().match({ id });
    if (error) console.error(`Error deleting from ${type}:`, error);
    else fetchData();
  };

  const handleApproveUser = async (profileId: string) => {
    // No longer using profiles/approvals in the custom flow
  };

  const generatePDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text('Relatório Geral de Escalas', 14, 22);

    // Add generation date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);

    // Prepare table data
    const tableData = services.map(service => {
      const serviceAssignments = assignments.filter(a => a.service_id === service.id);

      const assignedNames = serviceAssignments.length > 0
        ? serviceAssignments.map(a => `${volunteers.find(v => v.id === a.volunteer_id)?.name || 'Desconhecido'} (${a.role})`).join('\n')
        : 'Nenhum voluntário escalado';

      return [
        parseLocalDate(service.date).toLocaleDateString('pt-BR'),
        service.time,
        service.name,
        service.is_published ? 'Sim' : 'Não',
        assignedNames
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['Data', 'Horário', 'Evento', 'Publicado?', 'Escalados']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25 },
        4: { cellWidth: 'auto' }
      }
    });

    const fileName = `Escalas_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  };

  const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
        : 'text-slate-500 hover:bg-slate-100'
        }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8"
          >
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
                <ClipboardList size={32} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Vê Escala</h1>
              <p className="text-slate-500 text-sm">Acesse o painel administrativo</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Apelido (Usuário)</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Seu apelido"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="Digite a senha"
                  />
                </div>
                {loginError && (
                  <p className="text-rose-500 text-xs font-bold mt-2">{loginError}</p>
                )}
              </div>

              <div className="flex items-center">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 focus:outline-none"
                    />
                    <CheckCircle2 className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none" />
                  </div>
                  <span className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">Lembrar meus dados</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
              >
                Entrar no Sistema
              </button>
            </form>

            <p className="text-center text-slate-400 text-xs mt-8">
              Use as credenciais fornecidas pelo administrador.
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
            <ClipboardList size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Vê Escala</h1>
        </div>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 p-6 flex flex-col z-50 transition-transform duration-300 transform
        lg:translate-x-0 lg:static lg:inset-auto lg:z-auto
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="hidden lg:flex items-center space-x-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <ClipboardList size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Vê Escala</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={view === 'dashboard'}
            onClick={() => { setView('dashboard'); setIsMenuOpen(false); }}
          />
          {userRole === 'admin' && (
            <>
              <SidebarItem
                icon={Users}
                label="Voluntários"
                active={view === 'volunteers'}
                onClick={() => { setView('volunteers'); setIsMenuOpen(false); }}
              />
              <SidebarItem
                icon={UserPlus}
                label="Cadastrar Novo"
                active={view === 'register-volunteer'}
                onClick={() => { setView('register-volunteer'); setIsMenuOpen(false); }}
              />
              <SidebarItem
                icon={Calendar}
                label="Escalas"
                active={view === 'services'}
                onClick={() => { setView('services'); setIsMenuOpen(false); }}
              />
              <SidebarItem
                icon={Tag}
                label="Funções"
                active={view === 'roles'}
                onClick={() => { setView('roles'); setIsMenuOpen(false); }}
              />
              <SidebarItem
                icon={ClipboardList}
                label="Relatórios"
                active={view === 'reports'}
                onClick={() => { setView('reports'); setIsMenuOpen(false); }}
              />
            </>
          )}
          <SidebarItem
            icon={CheckCircle2}
            label={userRole === 'admin' ? "Escalados" : "Minhas Escalas"}
            active={view === 'assignments'}
            onClick={() => { setView('assignments'); setIsMenuOpen(false); }}
          />
          <SidebarItem
            icon={Clock}
            label="Disponibilidade"
            active={view === 'availability'}
            onClick={() => { setView('availability'); setIsMenuOpen(false); }}
          />
          <SidebarItem
            icon={Key}
            label="Alterar Senha"
            active={view === 'profile'}
            onClick={() => { setView('profile'); setIsMenuOpen(false); }}
          />
        </nav>

        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all mb-4"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>

        <div className="mt-auto p-4 bg-slate-100 rounded-2xl hidden lg:block">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Status</p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold">Sistema Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-3xl font-bold tracking-tight">
                  Bem-vindo, {volunteers.find(v => v.id === volunteerId)?.name || 'Administrador'}!
                </h2>
                <p className="text-slate-500 mt-1">
                  {userRole === 'admin' ? 'Aqui está o resumo das escalas da semana.' : 'Confira suas escalas e os próximos serviços.'}
                </p>
              </header>

              {userRole === 'volunteer' && volunteerId && (
                <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Minhas Escalas</h3>
                    <p className="opacity-80">Você está escalado para {assignments.filter(a => a.volunteer_id === volunteerId).length} serviços em breve.</p>
                  </div>
                  <button onClick={() => setView('assignments')} className="mt-4 md:mt-0 px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all">
                    Ver Minha Escala
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                    <Users size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Total Voluntários</p>
                  <h3 className="text-2xl font-bold">{volunteers.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <Calendar size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Total Escalas</p>
                  <h3 className="text-2xl font-bold">{services.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Escalados</p>
                  <h3 className="text-2xl font-bold">{assignments.length}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-bottom border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Próximas Escalas</h3>
                    <button onClick={() => setView('services')} className="text-indigo-600 text-sm font-semibold flex items-center">
                      Ver todas <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(userRole === 'admin' ? services.slice(0, 5) : services.filter(s => s.is_published && assignments.some(a => a.service_id === s.id && a.volunteer_id === volunteerId))).map(s => (
                      <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-600">
                            <span className="text-[10px] font-bold uppercase">{parseLocalDate(s.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                            <span className="text-sm font-bold leading-none">{parseLocalDate(s.date).getDate()}</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{s.name}</p>
                            <p className="text-xs text-slate-500 flex items-center">
                              <Clock size={12} className="mr-1" /> {s.time}
                            </p>
                          </div>
                        </div>
                        {userRole === 'admin' && (
                          <button
                            onClick={() => {
                              setNewAssignment({ ...newAssignment, service_id: s.id });
                              setView('assignments');
                            }}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                          >
                            Escalar
                          </button>
                        )}
                      </div>
                    ))}
                    {services.length === 0 && <p className="p-10 text-center text-slate-400 italic">Nenhuma escala cadastrada.</p>}
                    {userRole === 'volunteer' && assignments.filter(a => a.volunteer_id === volunteerId).length === 0 && <p className="p-10 text-center text-slate-400 italic">Você ainda não foi escalado para nenhum serviço.</p>}
                  </div>
                </div>

                {userRole === 'admin' && (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-bottom border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg">Voluntários Recentes</h3>
                      <button onClick={() => setView('volunteers')} className="text-indigo-600 text-sm font-semibold flex items-center">
                        Ver todos <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-4">
                      {volunteers.slice(0, 4).map(v => (
                        <div key={v.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-start">
                            <p className="font-bold text-slate-800 truncate">{v.name}</p>
                            <button
                              onClick={() => {
                                setEditingVolunteer(v);
                                setView('volunteers');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-1 text-slate-300 hover:text-indigo-600 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {v.roles.split(',').map(r => (
                              <span key={r} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 uppercase">
                                {r.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {volunteers.length === 0 && <p className="col-span-2 py-10 text-center text-slate-400 italic">Nenhum voluntário cadastrado.</p>}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'volunteers' && userRole === 'admin' && (
            <motion.div
              key="volunteers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Gerenciar Voluntários</h2>
                  <p className="text-slate-500 mt-1">Lista de membros e aprovações de conta.</p>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {editingVolunteer && (
                  <div className="lg:col-span-1">
                    <form onSubmit={handleUpdateVolunteer} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 sticky top-10">
                      <h3 className="font-bold text-lg flex items-center">
                        <Edit2 size={20} className="mr-2 text-indigo-600" /> Editar Voluntário
                      </h3>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome Completo</label>
                        <input
                          required
                          type="text"
                          value={editingVolunteer.name}
                          onChange={e => setEditingVolunteer({ ...editingVolunteer, name: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Apelido (Usuário)</label>
                        <input
                          required
                          type="text"
                          value={editingVolunteer.username}
                          onChange={e => setEditingVolunteer({ ...editingVolunteer, username: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Telefone</label>
                        <input
                          type="text"
                          value={editingVolunteer.phone}
                          onChange={e => setEditingVolunteer({ ...editingVolunteer, phone: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Funções</label>
                        <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          {roles.map(r => {
                            const isChecked = editingVolunteer.roles ? editingVolunteer.roles.split(',').includes(r.name) : false;
                            return (
                              <label key={r.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    const currentRoles = editingVolunteer.roles ? editingVolunteer.roles.split(',').filter(role => role !== '') : [];
                                    let updatedRoles;
                                    if (e.target.checked) updatedRoles = [...currentRoles, r.name];
                                    else updatedRoles = currentRoles.filter(role => role !== r.name);
                                    setEditingVolunteer({ ...editingVolunteer, roles: updatedRoles.join(',') });
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-slate-700 truncate font-semibold">{r.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div className="pt-2 pb-2">
                        <button
                          type="button"
                          onClick={() => handleResetPassword(editingVolunteer.id)}
                          className="w-full py-2 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-all flex items-center justify-center text-sm"
                        >
                          <Key size={16} className="mr-2" /> Redefinir Senha
                        </button>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingVolunteer(null)}
                          className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                        >
                          Cancelar
                        </button>
                        <button type="submit" className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center">
                          <Edit2 size={18} className="mr-2" /> Salvar
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className={editingVolunteer ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"}>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">Aprovações Pendentes</h3>
                    <div className="space-y-3">
                      {profiles.filter(p => !p.is_approved).map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="font-semibold text-slate-700">{p.email}</p>
                            <p className="text-xs text-slate-500">ID: {p.id}</p>
                          </div>
                          <button
                            onClick={() => handleApproveUser(p.id)}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors"
                          >
                            Aprovar
                          </button>
                        </div>
                      ))}
                      {profiles.filter(p => !p.is_approved).length === 0 && (
                        <p className="text-sm text-slate-400 italic text-center py-4">Nenhum usuário pendente de aprovação.</p>
                      )}
                    </div>
                  </div>
                  {volunteers.map(v => (
                    <div key={v.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                      <div>
                        <h4 className="font-bold text-lg text-slate-800">{v.name}</h4>
                        <p className="text-sm text-slate-500">{v.username} • {v.phone}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {v.roles.split(',').map(r => (
                            <span key={r} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                              {r.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => {
                            setEditingVolunteer(v);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => deleteItem('volunteers', v.id)}
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {volunteers.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                      <Users size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-400 font-medium">Nenhum voluntário cadastrado ainda.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'register-volunteer' && userRole === 'admin' && (
            <motion.div
              key="register-volunteer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <header className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">Cadastrar Novo Voluntário</h2>
                <p className="text-slate-500 mt-1">Crie uma nova conta de acesso e perfil para um voluntário.</p>
              </header>

              <form onSubmit={handleAddVolunteer} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b pb-2">Dados Pessoais</h3>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome Completo</label>
                      <input
                        required
                        type="text"
                        value={newVolunteer.name}
                        onChange={e => setNewVolunteer({ ...newVolunteer, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        placeholder="Ex: João Silva"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Telefone</label>
                      <input
                        type="text"
                        value={newVolunteer.phone}
                        onChange={e => setNewVolunteer({ ...newVolunteer, phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b pb-2">Credenciais de Acesso</h3>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Apelido (Usuário)</label>
                      <input
                        required
                        type="text"
                        value={newVolunteer.username}
                        onChange={e => setNewVolunteer({ ...newVolunteer, username: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        placeholder="Ex: joaosilva"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Senha Inicial</label>
                      <input
                        required
                        type="password"
                        value={newVolunteer.password}
                        onChange={e => setNewVolunteer({ ...newVolunteer, password: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 border-b pb-2">Atribuições e Funções</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {roles.map(r => {
                      const isChecked = newVolunteer.roles.split(',').includes(r.name);
                      return (
                        <label key={r.id} className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                const currentRoles = newVolunteer.roles ? newVolunteer.roles.split(',').filter(role => role !== '') : [];
                                let updatedRoles;
                                if (e.target.checked) updatedRoles = [...currentRoles, r.name];
                                else updatedRoles = currentRoles.filter(role => role !== r.name);
                                setNewVolunteer({ ...newVolunteer, roles: updatedRoles.join(',') });
                              }}
                              className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 focus:outline-none"
                            />
                            <CheckCircle2 className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none" />
                          </div>
                          <span className={`text-sm font-medium ${isChecked ? 'text-indigo-700' : 'text-slate-600'}`}>{r.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {registerError && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-bold text-center">
                    {registerError}
                  </div>
                )}

                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center text-lg">
                  <UserPlus size={24} className="mr-3" /> Concluir Cadastro
                </button>
              </form>
            </motion.div>
          )}

          {view === 'services' && (
            <motion.div
              key="services"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-3xl font-bold tracking-tight">Escalas</h2>
                <p className="text-slate-500 mt-1">Planeje os eventos e escalas da igreja.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <form onSubmit={handleAddService} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 sticky top-10">
                    <h3 className="font-bold text-lg flex items-center">
                      <Calendar size={20} className="mr-2 text-indigo-600" /> Nova Escala
                    </h3>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome do Evento</label>
                      <input
                        required
                        type="text"
                        value={newService.name}
                        onChange={e => setNewService({ ...newService, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        placeholder="Ex: Culto de Domingo"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Data</label>
                      <input
                        required
                        type="date"
                        value={newService.date}
                        onChange={e => setNewService({ ...newService, date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Horário</label>
                      <input
                        required
                        type="time"
                        value={newService.time}
                        onChange={e => setNewService({ ...newService, time: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center">
                      <Plus size={18} className="mr-2" /> Criar Escala
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Data</label>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Voluntário</label>
                      <select
                        value={filterVolunteerId}
                        onChange={e => setFilterVolunteerId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">Todos</option>
                        {volunteers.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    {(filterDate || filterVolunteerId) && (
                      <button
                        onClick={() => { setFilterDate(''); setFilterVolunteerId(''); }}
                        className="px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-lg text-sm font-bold transition-all"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services
                      .filter(s => {
                        const matchesDate = !filterDate || s.date === filterDate;
                        const matchesVolunteer = !filterVolunteerId || assignments.some(a => a.service_id === s.id && a.volunteer_id === parseInt(filterVolunteerId));
                        return matchesDate && matchesVolunteer;
                      })
                      .map(s => (
                        <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all relative">
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex flex-col items-center justify-center">
                              <span className="text-[10px] font-bold uppercase">{parseLocalDate(s.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                              <span className="text-lg font-bold leading-none">{parseLocalDate(s.date).getDate()}</span>
                            </div>
                            <button
                              onClick={() => deleteItem('services', s.id)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <h4 className="font-bold text-lg text-slate-800">{s.name}</h4>
                          <p className="text-sm text-slate-500 flex items-center mt-1">
                            <Clock size={14} className="mr-1" /> {s.time}
                          </p>

                          {/* Available Volunteers Section */}
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                              <CheckCircle2 size={12} className="mr-1 text-emerald-500" /> Disponíveis
                            </p>
                            <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                              {(() => {
                                const availableVols = availability
                                  .filter(a => a.date === s.date)
                                  .map(a => {
                                    const volunteer = volunteers.find(v => v.id === a.volunteer_id);
                                    return volunteer ? volunteer.name : null;
                                  })
                                  .filter(Boolean);

                                if (availableVols.length === 0) {
                                  return <span className="text-xs text-slate-400 italic">Ninguém marcouse disponível</span>;
                                }

                                return availableVols.map((name, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[10px] font-bold">
                                    {name}
                                  </span>
                                ));
                              })()}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setNewAssignment({ ...newAssignment, service_id: s.id });
                              setView('assignments');
                            }}
                            className="w-full mt-6 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            Gerenciar Escala
                          </button>
                        </div>
                      ))}
                    {services
                      .filter(s => {
                        const matchesDate = !filterDate || s.date === filterDate;
                        const matchesVolunteer = !filterVolunteerId || assignments.some(a => a.service_id === s.id && a.volunteer_id === parseInt(filterVolunteerId));
                        return matchesDate && matchesVolunteer;
                      }).length === 0 && (
                        <div className="col-span-2 text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                          <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                          <p className="text-slate-400 font-medium">Nenhuma escala encontrada com esses filtros.</p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'assignments' && (
            <motion.div
              key="assignments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-3xl font-bold tracking-tight">
                  {userRole === 'admin' ? 'Escalas' : 'Minhas Escalas'}
                </h2>
                <p className="text-slate-500 mt-1">
                  {userRole === 'admin' ? 'Atribua voluntários aos serviços.' : 'Confira os cultos nos quais você foi convocado para servir.'}
                </p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {userRole === 'admin' && (
                  <div className="lg:col-span-1">
                    <form onSubmit={handleAddAssignment} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 sticky top-10">
                      <h3 className="font-bold text-lg flex items-center">
                        <CheckCircle2 size={20} className="mr-2 text-indigo-600" /> Nova Escala
                      </h3>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Serviço</label>
                        <select
                          required
                          value={newAssignment.service_id}
                          onChange={e => setNewAssignment({ ...newAssignment, service_id: parseInt(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none"
                        >
                          <option value={0}>Selecione o Serviço</option>
                          {services.map(s => (
                            <option key={s.id} value={s.id}>{s.name} - {parseLocalDate(s.date).toLocaleDateString('pt-BR')}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Voluntário</label>
                        <select
                          required
                          value={newAssignment.volunteer_id}
                          onChange={e => setNewAssignment({ ...newAssignment, volunteer_id: parseInt(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none"
                        >
                          <option value={0}>Selecione o Voluntário</option>
                          {volunteers
                            .filter(v => {
                              // Do not show volunteers that are already assigned to this service
                              return !assignments.some(a => a.service_id === newAssignment.service_id && a.volunteer_id === v.id);
                            })
                            .map(v => {
                              const selectedService = services.find(s => s.id === newAssignment.service_id);
                              const isAvailable = selectedService && availability.some(av => av.volunteer_id === v.id && av.date === selectedService.date);
                              return (
                                <option key={v.id} value={v.id}>
                                  {v.name} {isAvailable ? '✅ (Disponível)' : ''}
                                </option>
                              );
                            })}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Função</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          {(() => {
                            const selectedVolunteer = volunteers.find(v => v.id === newAssignment.volunteer_id);
                            const availableRoles = selectedVolunteer ? selectedVolunteer.roles.split(',').map(r => r.trim()).filter(r => r !== '') : [];

                            if (availableRoles.length === 0) {
                              return <p className="text-xs text-slate-400 italic">Selecione um voluntário com funções cadastradas.</p>;
                            }

                            return availableRoles.map(roleName => {
                              const isChecked = newAssignment.role.split(',').map(r => r.trim()).includes(roleName);
                              return (
                                <label key={roleName} className="flex items-center space-x-3 cursor-pointer group">
                                  <div className="relative flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e => {
                                        const currentRoles = newAssignment.role ? newAssignment.role.split(',').map(r => r.trim()).filter(r => r !== '') : [];
                                        let updatedRoles;
                                        if (e.target.checked) {
                                          updatedRoles = [...currentRoles, roleName];
                                        } else {
                                          updatedRoles = currentRoles.filter(r => r !== roleName);
                                        }
                                        setNewAssignment({ ...newAssignment, role: updatedRoles.join(', ') });
                                      }}
                                      className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 focus:outline-none"
                                    />
                                    <CheckCircle2 className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none" />
                                  </div>
                                  <span className="text-xs text-slate-600 group-hover:text-indigo-600 transition-colors">{roleName}</span>
                                </label>
                              );
                            });
                          })()}
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <p className="text-[10px] text-slate-400 italic">Ou digite uma função personalizada abaixo:</p>
                        </div>
                        <input
                          type="text"
                          value={newAssignment.role}
                          onChange={e => setNewAssignment({ ...newAssignment, role: e.target.value })}
                          className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="Ex: Guitarra, Som..."
                        />
                      </div>

                      <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center">
                        <Plus size={18} className="mr-2" /> Confirmar Escala
                      </button>
                    </form>
                  </div>
                )}

                <div className={`${userRole === 'admin' ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
                  {services.filter(s => {
                    if (userRole === 'admin') return true;
                    if (!s.is_published) return false;
                    return assignments.some(a => a.service_id === s.id && a.volunteer_id === volunteerId);
                  }).map(service => {
                    const serviceAssignments = assignments.filter(a => a.service_id === service.id);
                    if (serviceAssignments.length === 0) return null;

                    return (
                      <div key={service.id} className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden ${userRole === 'volunteer' && serviceAssignments.some(a => a.volunteer_id === volunteerId) ? 'ring-2 ring-indigo-600' : ''}`}>
                        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold">{service.name}</h4>
                              {service.is_published ? (
                                <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-md text-[10px] uppercase font-bold tracking-wider">Publicada</span>
                              ) : userRole === 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => handlePublishService(service.id)}
                                  className="px-2 py-0.5 bg-amber-400 text-amber-900 rounded-md text-[10px] uppercase font-bold tracking-wider hover:bg-amber-300 transition-colors"
                                >
                                  Publicar
                                </button>
                              )}
                            </div>
                            <p className="text-xs opacity-80 mt-1">{parseLocalDate(service.date).toLocaleDateString('pt-BR')} às {service.time}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {userRole === 'volunteer' && serviceAssignments.some(a => a.volunteer_id === volunteerId) && (
                              <div className="flex items-center space-x-2">
                                {serviceAssignments.find(a => a.volunteer_id === volunteerId)?.status === 'confirmado' ? (
                                  <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-bold uppercase flex items-center">
                                    <CheckCircle2 size={12} className="mr-1" /> Confirmado
                                  </span>
                                ) : serviceAssignments.find(a => a.volunteer_id === volunteerId)?.status === 'negado' ? (
                                  <span className="px-3 py-1 bg-rose-500 text-white rounded-full text-[10px] font-bold uppercase flex items-center">
                                    <X size={12} className="mr-1" /> Negado
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-[10px] font-bold uppercase flex items-center">
                                    <Clock size={12} className="mr-1" /> Pendente
                                  </span>
                                )}
                              </div>
                            )}
                            <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase">
                              {serviceAssignments.length} Escalados
                            </span>
                          </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {serviceAssignments.map(a => {
                            const vName = volunteers.find(v => v.id === a.volunteer_id)?.name || 'Desconhecido';
                            return (
                              <div key={a.id} className={`p-4 flex justify-between items-center group ${a.volunteer_id === volunteerId ? 'bg-indigo-50/50' : ''}`}>
                                <div className="flex items-center space-x-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${a.volunteer_id === volunteerId ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {vName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800">{vName} {a.volunteer_id === volunteerId ? '(Você)' : ''}</p>
                                    <div className="flex items-center space-x-2">
                                      <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">{a.role}</p>
                                      {a.status === 'confirmado' && <CheckCircle2 size={12} className="text-emerald-500" />}
                                      {a.status === 'negado' && <X size={12} className="text-rose-500" />}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  {userRole === 'volunteer' && a.volunteer_id === volunteerId && a.status === 'pendente' && (
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleUpdateAssignmentStatus(a.id, 'confirmado')}
                                        className="px-3 py-1.5 bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-all flex items-center"
                                      >
                                        ACEITAR
                                      </button>
                                      <button
                                        onClick={() => handleUpdateAssignmentStatus(a.id, 'negado')}
                                        className="px-3 py-1.5 bg-rose-100 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-200 transition-all flex items-center"
                                      >
                                        RECUSAR
                                      </button>
                                    </div>
                                  )}
                                  {userRole === 'admin' && (
                                    <button
                                      onClick={() => deleteItem('assignments', a.id)}
                                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {assignments.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                      <CheckCircle2 size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-400 font-medium">Ninguém escalado ainda.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'roles' && userRole === 'admin' && (
            <motion.div
              key="roles"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Funções</h2>
                  <p className="text-slate-500 mt-1">Gerencie as funções disponíveis para os voluntários.</p>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <form onSubmit={handleAddRole} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 sticky top-10">
                    <h3 className="font-bold text-lg flex items-center">
                      <Tag size={20} className="mr-2 text-indigo-600" /> Nova Função
                    </h3>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome da Função</label>
                      <input
                        required
                        type="text"
                        value={newRole.name}
                        onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        placeholder="Ex: Som, Louvor, Recepção"
                      />
                    </div>
                    <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center">
                      <Plus size={18} className="mr-2" /> Adicionar
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  {roles.map(r => (
                    <div key={r.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                      <div>
                        <h4 className="font-bold text-lg text-slate-800">{r.name}</h4>
                      </div>
                      <button
                        onClick={() => deleteItem('roles', r.id)}
                        className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  {roles.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                      <Tag size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-400 font-medium">Nenhuma função cadastrada ainda.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'availability' && (
            <motion.div
              key="availability"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-3xl font-bold tracking-tight">Disponibilidade</h2>
                <p className="text-slate-500 mt-1">
                  {userRole === 'admin'
                    ? 'Veja quando os voluntários estão disponíveis para servir.'
                    : 'Informe os dias em que você poderá servir na igreja.'}
                </p>
              </header>

              <div className="space-y-6">
                {userRole === 'volunteer' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map(service => {
                      const av = availability.find(a => a.volunteer_id === volunteerId && a.date === service.date);
                      const isAvailable = !!av;

                      return (
                        <div key={service.id} className={`bg-white p-6 rounded-3xl border transition-all ${isAvailable ? 'border-emerald-200 shadow-emerald-50 shadow-lg' : 'border-slate-200 shadow-sm'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-colors ${isAvailable ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                <Calendar size={24} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800">{service.name}</h4>
                                <p className="text-xs text-slate-500">{parseLocalDate(service.date).toLocaleDateString('pt-BR')} às {service.time}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <span className="text-sm font-medium text-slate-600">Estará disponível?</span>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                              <button
                                onClick={() => !isAvailable && toggleAvailability(service.date, av)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isAvailable ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                SIM
                              </button>
                              <button
                                onClick={() => isAvailable && toggleAvailability(service.date, av)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isAvailable ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                NÃO
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {services.length === 0 && (
                      <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                        <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-400 font-medium">Nenhuma escala futura cadastrada pelo administrador.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availability.map(av => (
                      <div key={av.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all relative">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                              {parseLocalDate(av.date).getDate()}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">
                                {(() => {
                                  const service = services.find(s => s.date === av.date);
                                  return service ? service.name : parseLocalDate(av.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
                                })()}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium uppercase">
                                {parseLocalDate(av.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </p>
                              <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-1">{av.volunteer_name}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteAvailability(av.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {availability.length === 0 && (
                      <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                        <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-400 font-medium">Nenhuma disponibilidade registrada pelos voluntários.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md mx-auto space-y-8"
            >
              <header className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">Segurança</h2>
                <p className="text-slate-500 mt-1">Mantenha sua conta protegida alterando sua senha.</p>
              </header>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Lock size={32} />
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nova Senha</label>
                    <input
                      required
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Confirmar Nova Senha</label>
                    <input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>

                  {passwordError && (
                    <p className="text-rose-500 text-sm font-bold text-center">{passwordError}</p>
                  )}
                  {passwordSuccess && (
                    <p className="text-emerald-500 text-sm font-bold text-center">{passwordSuccess}</p>
                  )}

                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center">
                    <Key size={18} className="mr-2" /> Atualizar Senha
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'reports' && userRole === 'admin' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8 max-w-5xl mx-auto"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">Relatórios</h2>
                  <p className="text-slate-500 mt-1">Visualize e exporte todas as escalas e voluntários.</p>
                </div>
                <button
                  onClick={generatePDF}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center whitespace-nowrap"
                >
                  <ClipboardList size={20} className="mr-2" />
                  Baixar PDF Completo
                </button>
              </header>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-lg text-slate-800">Pré-visualização dos Dados</h3>
                  <p className="text-sm text-slate-500 mt-1">Total de {services.length} evento(s) cadastrado(s).</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold border-b border-slate-200">Data e Hora</th>
                        <th className="p-4 font-bold border-b border-slate-200">Evento</th>
                        <th className="p-4 font-bold border-b border-slate-200">Status</th>
                        <th className="p-4 font-bold border-b border-slate-200">Equipe Escalada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {services.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                            Nenhuma escala encontrada.
                          </td>
                        </tr>
                      ) : (
                        services.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(service => {
                          const serviceAssignments = assignments.filter(a => a.service_id === service.id);
                          return (
                            <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4">
                                <p className="font-bold text-slate-800 whitespace-nowrap">
                                  {parseLocalDate(service.date).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-xs text-slate-500">{service.time}</p>
                              </td>
                              <td className="p-4">
                                <span className="font-medium text-slate-700">{service.name}</span>
                              </td>
                              <td className="p-4">
                                {service.is_published ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    Publicado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    Pendente
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                {serviceAssignments.length > 0 ? (
                                  <div className="flex flex-col space-y-1">
                                    {serviceAssignments.map(a => (
                                      <div key={a.id} className="text-sm flex items-center">
                                        <span className="font-medium text-slate-700 mr-2">
                                          {volunteers.find(v => v.id === a.volunteer_id)?.name || 'Desconhecido'}
                                        </span>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {a.role}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-400 italic">Sem escalados</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
