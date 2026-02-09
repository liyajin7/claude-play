1. in separate terminal window, run `aws sso login`. Login with Okta
2. in VScode, open your dir and check that you're in with `aisi whoami`

### instance
(3. create an instance with `aisi instance create`)
4. ssh into your instance with `ssh [instance-name]`
5. to connect VSCode to the instance (so you can see files locally), open command palette (Cmd+Shift+P) and type "Remote-SSH". activate your [instance-name]
6. this should open the remote in VSCode. then, can use command palette again to open `/home/ubuntu`, the home directory on the VM instance.

### venv
7. if you want to install packages:
    - `uv venv`
    - `source .venv/bin/activate`
    - then you can use uv to install, eg `uv pip install numpy matplotlib`

### claude code
8. to use claude code, daily you should run 
`uv tool install git+ssh://git@github.com/AI-Safety-Institute/agentup.git`
to give you claude credentials
9. run `claudeup`