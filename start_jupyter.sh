#!/bin/bash
# Launch Jupyter Lab with the claude-play virtual environment

cd /home/ubuntu/claude-play
source .venv/bin/activate
jupyter lab --ip=0.0.0.0 --no-browser --allow-root
