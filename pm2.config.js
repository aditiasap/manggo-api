module.exports = {
    apps: [
        {
            name: "manggo-api",
            script: "./app.js",
            node_args: "--env-file=.env",
            watch: false,
            instances: "max",
            exec_mode : "cluster",
        },
    ],
};