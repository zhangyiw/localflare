import { useState, useEffect } from "react"
import { NavLink, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Database02Icon,
  HardDriveIcon,
  Folder01Icon,
  Layers01Icon,
  TaskDone01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Home01Icon,
  CommandLineIcon,
  GlobalIcon,
  DashboardSpeed01Icon,
} from "@hugeicons/core-free-icons"
import { bindingsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

interface NavItem {
  icon: IconSvgElement
  label: string
  path: string
  colorClass: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: "Storage",
    items: [
      {
        icon: Database02Icon,
        label: "D1 Databases",
        path: "/d1",
        colorClass: "text-d1",
      },
      {
        icon: HardDriveIcon,
        label: "KV Namespaces",
        path: "/kv",
        colorClass: "text-kv",
      },
      {
        icon: Folder01Icon,
        label: "R2 Buckets",
        path: "/r2",
        colorClass: "text-r2",
      },
    ],
  },
  {
    title: "Compute",
    items: [
      {
        icon: Layers01Icon,
        label: "Durable Objects",
        path: "/do",
        colorClass: "text-do",
      },
      {
        icon: TaskDone01Icon,
        label: "Queues",
        path: "/queues",
        colorClass: "text-queues",
      },
    ],
  },
  {
    title: "Monitoring",
    items: [
      {
        icon: GlobalIcon,
        label: "Network",
        path: "/network",
        colorClass: "text-blue-500",
      },
      {
        icon: CommandLineIcon,
        label: "Tail Logs",
        path: "/logs",
        colorClass: "text-green-500",
      },
    ],
  },
]

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  const { data: bindings, isError, isLoading } = useQuery({
    queryKey: ["bindings"],
    queryFn: bindingsApi.getAll,
    refetchInterval: 5000, // Check connection every 5 seconds
    retry: 1,
  })

  // Update connection status based on query state
  useEffect(() => {
    if (isLoading) {
      setConnectionStatus('connecting')
    } else if (isError) {
      setConnectionStatus('disconnected')
    } else if (bindings) {
      setConnectionStatus('connected')
    }
  }, [isLoading, isError, bindings])

  const getBindingCount = (path: string): number => {
    if (!bindings) return 0
    switch (path) {
      case "/d1":
        return bindings.bindings.d1.length
      case "/kv":
        return bindings.bindings.kv.length
      case "/r2":
        return bindings.bindings.r2.length
      case "/do":
        return bindings.bindings.durableObjects.length
      case "/queues":
        return bindings.bindings.queues.producers.length
      default:
        return 0
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        {!isCollapsed && (
          <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
            <svg
              className="size-8 shrink-0"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="100" height="100" rx="20" className="fill-primary" />
              <path d="M20 75 L20 45 L32 45 L32 75 Z" fill="white" />
              <path d="M38 75 L38 30 L50 30 L50 75 Z" fill="white" />
              <path d="M56 75 L56 55 L68 55 L68 75 Z" fill="white" />
              <path d="M74 75 L74 20 L86 20 L86 75 Z" fill="white" />
            </svg>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-sidebar-foreground">
                Localflare
              </span>
              {bindings?.name && (
                <p className="text-xs text-muted-foreground truncate">
                  {bindings.name}
                </p>
              )}
            </div>
          </NavLink>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <HugeiconsIcon
            icon={isCollapsed ? ArrowRight01Icon : ArrowLeft01Icon}
            size={16}
            strokeWidth={2}
          />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2">
          {/* Home link */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors mb-2",
                isCollapsed && "justify-center px-2",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )
            }
          >
            <HugeiconsIcon icon={Home01Icon} className="size-4 shrink-0" strokeWidth={2} />
            {!isCollapsed && <span>Overview</span>}
          </NavLink>

          {/* Nav groups */}
          {navGroups.map((group) => (
            <div key={group.title} className="mt-4">
              {!isCollapsed && (
                <div className="px-2.5 mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.title}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const count = getBindingCount(item.path)
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors",
                          isCollapsed && "justify-center px-2",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <HugeiconsIcon
                            icon={item.icon}
                            className={cn(
                              "size-4 shrink-0",
                              isActive ? item.colorClass : ""
                            )}
                            strokeWidth={2}
                          />
                          {!isCollapsed && (
                            <>
                              <span className="flex-1 truncate">{item.label}</span>
                              {count > 0 && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md tabular-nums">
                                  {count}
                                </span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Analytics Explorer */}
      <div className="px-2 pb-2">
        <Link
          to="/analytics"
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors",
            isCollapsed && "justify-center px-2",
            "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <HugeiconsIcon icon={DashboardSpeed01Icon} className="size-4 shrink-0 text-orange-500" strokeWidth={2} />
          {!isCollapsed && <span>Analytics Explorer</span>}
        </Link>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn("flex items-center gap-2", isCollapsed ? "justify-center" : "px-2.5")}>
          <span
            className={cn(
              "size-2 rounded-full shrink-0",
              connectionStatus === 'connected' && "bg-green-500",
              connectionStatus === 'connecting' && "bg-yellow-500 animate-pulse",
              connectionStatus === 'disconnected' && "bg-red-500"
            )}
          />
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">
                {connectionStatus === 'connected' && "Connected"}
                {connectionStatus === 'connecting' && "Connecting..."}
                {connectionStatus === 'disconnected' && "Disconnected"}
              </p>
              <p className="text-[10px] text-muted-foreground/60 truncate">
                {connectionStatus === 'connected' && `Port ${new URLSearchParams(window.location.search).get('port') || '8787'}`}
                {connectionStatus === 'disconnected' && "Check if wrangler is running"}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
