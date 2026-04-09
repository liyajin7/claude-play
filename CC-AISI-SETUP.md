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

### git
10. create a new branch + move HEAD to it at same time with `git checkout -b branchname`. more on basic branching [here](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging). `git checkout branchname` to check out a branchname (including `master`).
11. commit all with message with `git commit -a -m 'message'`

### jupyter
(interim notes)
- IP address: single computer's address (like a building)
- port: places for services to plug in / use (like doors on the building)
- localhost vs. server: two separate 'computers', each with their own IP address. An Ubuntu server in the cloud is like a remote computer you're writing code on.
- `jupyter lab` spins up (1) Python kernel(s) that actually run the notebook code, and (2) a Jupyter-hosted server/webapp that serves the Jupyter UI in browser.

#### UNKNOWN: port-forwarding. 
What's running on Jupyter vs. in VSCode? Why forward ports?
- VSCode usually automatically forwards code from your local machine's port e.g. `localhost:8888` to the server's port 8888. If you suddenly can't connect to Jupyter, but in VSCode the kernel is still running, the port forwarding is probably broken. 
Go to PORTS in VSCode (by TERMINAL), delete 8888, and re-add.

### misc
- Cmd/Ctrl+Shift+P → "Developer: Reload Window" if extensions not working

# to add to .setup script later
- Jupyter notebook vis
- cloning this repo