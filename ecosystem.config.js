module.exports = {
    apps: [
        {
            name: 'mte-device-entry',
            cwd: '/root/mte-device-entry-platform',
            script: 'node_modules/.bin/ts-node',
            args: 'src/main.ts',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production'
            },
            error_file: '/root/logs/mte-device-entry-error.log',
            out_file: '/root/logs/mte-device-entry-out.log',
            time: true
        }
    ]
};