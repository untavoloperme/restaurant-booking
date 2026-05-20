module.exports = {
  apps: [
    {
      name: "restaurant-booking",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/root/restaurant-booking",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/root/.pm2/logs/restaurant-booking-error.log",
      out_file: "/root/.pm2/logs/restaurant-booking-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
