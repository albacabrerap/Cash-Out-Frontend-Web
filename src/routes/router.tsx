import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { PageLoader } from '@/components/feedback/PageLoader'
import { AppShell } from '@/components/layout/AppShell'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { RootLayout } from '@/components/layout/RootLayout'
import RouteErrorPage from '@/pages/RouteErrorPage'
import { GuestOnly } from './GuestOnly'
import type { RouteHandle } from './navigation'
import { RequireAuth } from './RequireAuth'

/** Paginas en lazy loading; layouts y error van en el paquete principal para mostrarse si falla la descarga. */
function page(load: () => Promise<{ default: ComponentType }>): RouteObject['lazy'] {
  return async () => ({ Component: (await load()).default })
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <PageLoader fullScreen />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, lazy: page(() => import('@/pages/LandingPage')) },
          {
            element: <GuestOnly />,
            children: [
              {
                path: 'login',
                handle: { title: 'Iniciar sesión' } satisfies RouteHandle,
                lazy: page(() => import('@/pages/auth/LoginPage')),
              },
              {
                path: 'registro',
                handle: { title: 'Crear cuenta' } satisfies RouteHandle,
                lazy: page(() => import('@/pages/auth/RegisterPage')),
              },
            ],
          },
          {
            // Fuera de GuestOnly: el enlace del correo se abre con o sin sesion.
            path: 'verificar-correo',
            handle: { title: 'Confirmar correo' } satisfies RouteHandle,
            lazy: page(() => import('@/pages/auth/VerifyEmailPage')),
          },
          {
            path: '*',
            handle: { title: 'Página no encontrada' } satisfies RouteHandle,
            lazy: page(() => import('@/pages/NotFoundPage')),
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            // Se proyecta: va a pantalla completa, sin el menu de la app.
            path: 'carrera/:code/pantalla',
            handle: { title: 'Pantalla de la carrera' } satisfies RouteHandle,
            lazy: page(() => import('@/pages/race/RaceHostPage')),
          },
          {
            path: 'minijuegos/sube-o-baja/:code/pantalla',
            handle: { title: 'Pantalla de ¿Sube o baja?' } satisfies RouteHandle,
            lazy: page(() => import('@/pages/updown/UpDownHostPage')),
          },
          {
            path: 'minijuegos/arma-tu-portafolio/:code/pantalla',
            handle: { title: 'Pantalla de Arma tu portafolio' } satisfies RouteHandle,
            lazy: page(() => import('@/pages/portfolioGame/PortfolioGameHostPage')),
          },
          {
            element: <AppShell />,
            children: [
              {
                path: 'resumen',
                handle: { crumb: 'Resumen', title: 'Resumen' } satisfies RouteHandle,
                lazy: page(() => import('@/pages/dashboard/DashboardPage')),
              },
              {
                path: 'metas',
                handle: { crumb: 'Metas', title: 'Metas' } satisfies RouteHandle,
                children: [
                  { index: true, lazy: page(() => import('@/pages/goals/GoalsPage')) },
                  {
                    path: ':id',
                    handle: { crumb: 'Detalle', title: 'Detalle de la meta' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/goals/GoalDetailPage')),
                  },
                ],
              },
              {
                path: 'proyeccion',
                handle: { crumb: 'Proyección', title: 'Proyección' } satisfies RouteHandle,
                lazy: page(() => import('@/pages/projections/ProjectionPage')),
              },
              {
                path: 'perfil',
                handle: { crumb: 'Mi perfil', title: 'Mi perfil' } satisfies RouteHandle,
                lazy: page(() => import('@/pages/profile/ProfilePage')),
              },
              {
                path: 'admin',
                element: <RequireAuth roles={['ADMIN']} />,
                handle: { crumb: 'Administración', title: 'Administración' } satisfies RouteHandle,
                children: [
                  { index: true, lazy: page(() => import('@/pages/admin/AdminDashboardPage')) },
                  {
                    path: 'usuarios',
                    handle: { crumb: 'Usuarios', title: 'Usuarios' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/admin/AdminUsersPage')),
                  },
                  {
                    path: 'minijuegos',
                    handle: { crumb: 'Minijuegos', title: 'Catálogo de minijuegos' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/admin/AdminMinigamesPage')),
                  },
                  {
                    path: 'sube-o-baja',
                    handle: { crumb: '¿Sube o baja?', title: 'Casos de ¿Sube o baja?' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/admin/AdminUpDownCasesPage')),
                  },
                  {
                    path: 'activos',
                    handle: { crumb: 'Activos', title: 'Catálogo de activos' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/admin/AdminAssetsPage')),
                  },
                ],
              },
              {
                path: 'carrera',
                handle: { crumb: 'Carrera de trading', title: 'Carrera de trading' } satisfies RouteHandle,
                children: [
                  { index: true, lazy: page(() => import('@/pages/race/RaceHomePage')) },
                  {
                    path: ':code',
                    handle: { crumb: 'Sala', title: 'Sala de la carrera' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/race/RacePlayerPage')),
                  },
                ],
              },
              {
                path: 'minijuegos',
                handle: { crumb: 'Minijuegos', title: 'Minijuegos' } satisfies RouteHandle,
                children: [
                  { index: true, lazy: page(() => import('@/pages/minigames/MinigamesPage')) },
                  {
                    path: 'sube-o-baja/:code',
                    handle: { crumb: '¿Sube o baja?', title: '¿Sube o baja?' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/updown/UpDownPlayerPage')),
                  },
                  {
                    path: 'arma-tu-portafolio/:code',
                    handle: { crumb: 'Arma tu portafolio', title: 'Arma tu portafolio' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/portfolioGame/PortfolioGamePlayerPage')),
                  },
                  {
                    path: ':id',
                    handle: { crumb: 'Partida', title: 'Partida' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/minigames/MinigamePlayPage')),
                  },
                ],
              },
              {
                path: 'portafolio',
                handle: { crumb: 'Portafolio', title: 'Portafolio' } satisfies RouteHandle,
                children: [
                  { index: true, lazy: page(() => import('@/pages/portfolio/PortfolioPage')) },
                  {
                    path: 'mercado',
                    handle: { crumb: 'Mercado', title: 'Mercado' } satisfies RouteHandle,
                    children: [
                      { index: true, lazy: page(() => import('@/pages/portfolio/MarketPage')) },
                      {
                        path: ':id',
                        handle: { crumb: 'Activo', title: 'Activo' } satisfies RouteHandle,
                        lazy: page(() => import('@/pages/portfolio/AssetPage')),
                      },
                    ],
                  },
                  {
                    path: 'ordenes',
                    handle: { crumb: 'Órdenes', title: 'Órdenes' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/portfolio/OrdersPage')),
                  },
                  {
                    path: 'noticias',
                    handle: { crumb: 'Noticias', title: 'Noticias' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/portfolio/NewsPage')),
                  },
                ],
              },
              {
                path: 'movimientos',
                handle: { crumb: 'Movimientos', title: 'Movimientos' } satisfies RouteHandle,
                lazy: page(() => import('@/pages/movements/MovementsLayout')),
                children: [
                  { index: true, element: <Navigate to="todos" replace /> },
                  {
                    path: 'todos',
                    handle: { crumb: 'Todos', title: 'Movimientos' } satisfies RouteHandle,
                    lazy: page(() => import('@/pages/movements/AllMovementsPage')),
                  },
                  {
                    path: 'gastos',
                    handle: { crumb: 'Gastos', title: 'Gastos' } satisfies RouteHandle,
                    children: [
                      { index: true, lazy: page(() => import('@/pages/movements/ExpensesPage')) },
                      {
                        path: ':id',
                        handle: { crumb: 'Detalle', title: 'Detalle del gasto' } satisfies RouteHandle,
                        lazy: page(() => import('@/pages/movements/ExpenseDetailPage')),
                      },
                    ],
                  },
                  {
                    path: 'ingresos',
                    handle: { crumb: 'Ingresos', title: 'Ingresos' } satisfies RouteHandle,
                    children: [
                      { index: true, lazy: page(() => import('@/pages/movements/IncomesPage')) },
                      {
                        path: ':id',
                        handle: { crumb: 'Detalle', title: 'Detalle del ingreso' } satisfies RouteHandle,
                        lazy: page(() => import('@/pages/movements/IncomeDetailPage')),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
