const express = require('express');
const crypto = require('crypto');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

let config = undefined;
try {
    config = require('./config.json');
}catch(e){
    throw new Error(`Failed to read ./config.json file: ${e.stack}`);
}

const repositories = config.repositories.map((item) => {
    if(item?.path !== undefined && item?.branch !== undefined && item?.command !== undefined && item?.full_name !== undefined){
        return {
            path: item.path,
            branch: item.branch,
            command: item.command,
            full_name: item.full_name
        }
    }
    return undefined;
}).filter((item) => item !== undefined);

const secret = config.secret ?? false;

if(repositories.length === 0){
    throw new Error(`Can't start with 0 correct repositories, check repositories format in ./config.json`);
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', true);

app.post('/', async (req, res) => {
    const signature = req.header("X-Hub-Signature-256") ?? false;
    const event = req.header("X-GitHub-Event") ?? false;
    if(secret !== false){
        const hash = `sha256=${crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex')}`;
        if(hash !== signature){
            console.log(`Forbidden request for: ${req.ip}`);
            console.log(JSON.stringify(req.body));
            return res.status(403).send();
        }
    }

    console.log(`Got incoming request (${event ?? 'undefined'} event) from ${req.ip} with payload:`);
    console.log(req.body);

    switch(event){
        case 'push':
            for(const repository of repositories){
                if(repository.branch === req.body?.ref && repository.full_name === req.body?.repository?.full_name){
                    console.log(`Found repository in config: ${repository.full_name}, for branch: ${repository.branch} - commit ${req.body.head_commit.id} (${req.body.head_commit.message}) from ${req.body.head_commit.timestamp} by ${req.body.head_commit.committer.username}.`);
                    let command = `cd ${repository.path} && git pull`;
                    console.log(`Starting executing command for updating repository: ${command}`);
                    let stdout = false;
                    try {
                        const execute = await exec(command);
                        stdout = execute.stdout;
                    }catch(e){
                        console.log(`Failed while updating repository: ${e.stack}`);
                        return res.status(500).send(`Failed handle event.`);
                    }
                    console.log(`Updating repository command result: ${stdout}`);
                    command = `cd ${repository.path} && ${repository.command}`;
                    console.log(`Starting executing user command (from ./config.json): ${command}`);
                    stdout = false;
                    try {
                        const execute = await exec(command);
                        stdout = execute.stdout;
                    }catch(e){
                        console.log(`Failed while executing user command: ${e.stack}`);
                        return res.status(500).send(`Failed handle event.`);
                    }
                    console.log(`User command result: ${stdout}`);
                    return res.status(200).send(`Updated ${repository.branch}, executed command: ${repository.command}`);
                }
            }
            console.log(`Doing nothing, could find target repository command in config: ${req.body?.repository.full_name}, for branch: ${req.body?.ref}.`);
        break;
        default:
            console.log(`No handler for ${event} specified.`);
    }
    
    res.status(200).send();
});

app.listen(config.port ?? 3000, () => {
    console.log(`Running github-deploy-hook on ${config.port ?? 3000} port.`);
});