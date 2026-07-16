import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';

import { Layout } from '@/components/layout';
import { ProtectedRoute } from '@/components/protected-route';

import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Practice from '@/pages/practice';
import Exam from '@/pages/exam';
import Result from '@/pages/result';
import Review from '@/pages/review';
import History from '@/pages/history';

import AdminDashboard from '@/pages/admin/dashboard';
import AdminQuestions from '@/pages/admin/questions';
import QuestionForm from '@/pages/admin/question-form';
import AdminSubjects from '@/pages/admin/subjects';
import AdminExamTypes from '@/pages/admin/exam-types';
import AdminUsers from '@/pages/admin/users';

const queryClient = new QueryClient();

function withLayout(Component: React.ComponentType<any>) {
  return function LayoutWrapped(props: any) {
    return (
      <Layout>
        <Component {...props} />
      </Layout>
    );
  };
}

const DashboardPage  = withLayout(Dashboard);
const PracticePage   = withLayout(Practice);
const ResultPage     = withLayout(Result);
const ReviewPage     = withLayout(Review);
const HistoryPage    = withLayout(History);
const AdminDashPage  = withLayout(AdminDashboard);
const AdminQsPage    = withLayout(AdminQuestions);
const QFormPage      = withLayout(QuestionForm);
const AdminSubjPage  = withLayout(AdminSubjects);
const AdminTypesPage = withLayout(AdminExamTypes);
const AdminUsersPage = withLayout(AdminUsers);

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={() => <Redirect to="/login" />} />
      <Route path="/login" component={Login} />

      {/* Student Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/practice">
        {() => <ProtectedRoute component={PracticePage} />}
      </Route>
      <Route path="/exam/:sessionId">
        {() => <ProtectedRoute component={Exam} />}
      </Route>
      <Route path="/result/:sessionId">
        {() => <ProtectedRoute component={ResultPage} />}
      </Route>
      <Route path="/review/:sessionId">
        {() => <ProtectedRoute component={ReviewPage} />}
      </Route>
      <Route path="/history">
        {() => <ProtectedRoute component={HistoryPage} />}
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        {() => <ProtectedRoute adminOnly component={AdminDashPage} />}
      </Route>
      <Route path="/admin/questions">
        {() => <ProtectedRoute adminOnly component={AdminQsPage} />}
      </Route>
      <Route path="/admin/questions/new">
        {() => <ProtectedRoute adminOnly component={QFormPage} />}
      </Route>
      <Route path="/admin/questions/:id/edit">
        {() => <ProtectedRoute adminOnly component={QFormPage} />}
      </Route>
      <Route path="/admin/subjects">
        {() => <ProtectedRoute adminOnly component={AdminSubjPage} />}
      </Route>
      <Route path="/admin/exam-types">
        {() => <ProtectedRoute adminOnly component={AdminTypesPage} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute adminOnly component={AdminUsersPage} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="fedcsq-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
