export type WarpTarget = {
    id: string
    host: string
    title: string
    url: string
}

// @ts-ignore - temp impl until this is injected by the server at runtime
window.warpTargets = [
    {
        id: "app-dev",
        host: "user.localhost",
        title: "App (dev)",
        url: "http://localhost:8080/",
    },
    {
        id: "app-dashboard-dev",
        host: "admin.localhost",
        title: "App Dashboard (dev)",
        url: "http://localhost:8080/admin/dashboard",
    },
    {
        id: "app-qa",
        host: "user.localhost",
        title: "App (QA)",
        url: "http://qa-environment/",
    },
    {
        id: "app-dashboard-qa",
        host: "admin.localhost",
        title: "App Dashboard (QA)",
        url: "http://qa-environment/admin/dashboard",
    },
    {
        id: "this",
        host: "localhost",
        title: "This site",
        url: "http://localhost:5173/",
    },
    {
        id: "this-alt",
        host: "alt.localhost",
        title: "This site (alt)",
        url: "http://localhost:5173/",
    }
];
