# github-deploy-hook
NodeJS Express deploy hook application for GitHub, that checks new `push` events and handle it with ./config.json file:
1. Search repositoriy with its full_name (example: `USER-NAME/project`).
2. Checking target event branch equal to config repository branch.
3. Prepare command with navigation to directory, making `git pull` and then execute your optional command (`command` key in ./config.json -> `repositories` array).

### Configuration

For starting application, you should make ./config.json file, like ./config.example.json in application directory.

```json
{
    "port": 3000,
    "secret": "secret_key",
    "repositories": [
        {
            "full_name": "USER-NAME/project",
            "path": "/home/user/project/",
            "branch": "refs/heads/main",
            "command": "sh ./start.sh"
        }
    ]
}
```

`port` - express web server running port (optional, if not set - 3000).
`secret` - secret key (optional, if not set just skip authentication).
`repositories` - array of repositories with objects as example: `{"full_name": "USER-NAME/project", "path": "/home/user/project/", "branch": "refs/heads/main", "command": "sh ./start.sh"}`.

All properties for `repositories` array are required (as in example - all keys should be presented).

### Running

Install all required dependecies:

```bash
npm ci
```

Preffered to start the github-deploy-hook with PM2 (https://www.npmjs.com/package/pm2).

After pm2 successfully installation and configuration, just run:

```bash
$ pm2 start main.js
```

Then run command to save that application running after server reboot or etc:

```bash
$ pm2 save
```

To see logs of application, write:
```
$ pm2 monit
```