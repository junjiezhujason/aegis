#!/bin/bash

ipnport=$1
version=$2
runmode=$3
maindir=$4

usage="Usage: bash $0 port_num [lite/core] [debug/deploy] [cache_dir]" 

if (( $# < 4 )); then
    echo "Error: wrong number of inputs"
    echo $usage
    exit 1
fi

# lite version or the core version
if [ "$version" = "lite" ]; then
    echo "Running lite mode with example data: $maindir"
    maindir="./data"
    lite_opt="--lite "
elif [ "$version" = "core" ]; then
    echo "Cache directory: $maindir"
    lite_opt=""
else
    echo "Error: version must be core or lite"
    echo $usage
    exit 1
fi

# debug or deploy mode
if [ "$runmode" = "debug" ]; then
    echo "Running app in debug mode (default)..."
    debug_opt="--debug "
elif [ "$runmode" = "deploy" ]; then
    echo "Running app without debugger (testing deployment)..."
    debug_opt=""
else
    echo "Error: run mode must be debug or deploy"
    echo $usage
    exit 1
fi

# indicate the local host
echo -e "
Copy/paste the following into your browser to see the local app:
-----------------------------------------------------------------
http://localhost:$ipnport
-----------------------------------------------------------------
"

# launch the web app with appropriate options
cmd="python3 main.py $debug_opt$lite_opt--port $ipnport --folder $maindir"
echo "$cmd"
echo ""
$cmd
