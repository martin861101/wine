module.exports = {
  apps: [
    {
      name: "wine-ui",
      cwd: "/home/apps/wine/ui",
      script: "npm",
      args: "run dev:public",
      interpreter: "none",
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
