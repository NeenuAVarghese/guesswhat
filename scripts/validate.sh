#!/bin/bash
#################
# validate.sh ###
version="1.3" ###
### mittman #####
#################

# Input files
html=("index.html")
css=("style.css")
js=("app.js" "client.js")

# Tests to run
list="jshint csslint tidy whitespace stylish"
config="$PWD/.webapp"

checkdep() { type -p $1 &>/dev/null; }

# Color
alert="\e[1;34m"
notice="\e[1;39m"
warn="\e[1;33m"
fail="\e[1;31m"
invert="\e[7m"
reset="\e[0m"

run_utility() {
  if checkdep $cmd; then
    echo -e "${alert}==>${reset} ${notice}Running '${cmd}' ${what} validation${reset}"
    # filenames stored in array
    for file in ${input[@]}; do
      if [ -f "$file" ]; then
        # capture output to variable
        output=$($cmd $params "$file" 2>&1)
        if [ ! -z "$output" ]; then
          echo -e "${fail}==> FAIL${reset} $file"
          echo "$output"
          error="true"
        fi
      else
        echo -e "${warn}==> WARN${reset} Not a file: $file"
      fi
    done
  else
    echo -e "${warn}Missing ${cmd}${reset}. Skipping ${what} validation"
  fi
}

whitespace() {
  if checkdep grep; then
    if [ -f "$1" ]; then
      # trailing spaces
      GREP_COLOR="1;30;41" grep -n --color=always " $" "$1"
      # any tab characters
      GREP_COLOR="1;30;41" grep -n --color=always $'\t' "$1"
    else
      echo -e "${warn}==> WARN${reset} Not a file: $1"
    fi
  else
    echo -e "${warn}Missing grep${reset}. Skipping ${what} validation"
  fi
}

stylish() {
  if checkdep grep; then
    if [ -f "$1" ]; then
      # compact curly brace
      GREP_COLOR="1;30;41" grep -n --color=always "){" "$1"
    else
      echo -e "${warn}==> WARN${reset} Not a file: $1"
    fi
  else
    echo -e "${warn}Missing grep${reset}. Skipping ${what} validation"
  fi
}

parse_utils() {
  for cmd in $list; do
    if [ $cmd = "tidy" ]; then
      what="HTML"
      params="-qe"
      input="${html[@]}"
      run_utility
    elif [ "$cmd" = "csslint" ]; then
      what="CSS"
      params="--quiet"
      input="${css[@]}"
      run_utility
    elif [ "$cmd" = "jshint" ]; then
      what="Javascript"
      params=""
      input="${js[@]}"
      run_utility
    elif [ "$cmd" = "whitespace" ]; then
      what="Whitespace"
      params=""
      input=("${html[@]}" "${css[@]}" "${js[@]}")
      run_utility
    elif [ "$cmd" = "stylish" ]; then
      what="Styling"
      params=""
      input=("${html[@]}" "${css[@]}" "${js[@]}")
      run_utility
    else
      echo -e "${fail}==> FAIL${reset} Unknown command $cmd"
    fi
  done

  if [ "$error" = "true" ]; then
    exit 1
  fi
}


if [ ! -z "$1" ]; then
  echo "validate.sh -- version $version"
  echo -e "\nUtility to easily run webapp validation tests"
  echo "Copyright (c) 2016 mittman"
  echo "Dual licensed: MIT (aka X11) and GPLv2"
  [ "$1" = "--version" ] && exit 0

  if [ ! -f "$config" ]; then
    echo -e "\n${alert}==>${reset} ${notice}Creating $config file${reset}"
    echo 'html=("index.html" "about.html")' > $config
    echo 'css=("style.css")' >> $config
    echo 'js=("js/app.js" "server.js")' >> $config
    echo 'list="jshint csslint tidy whitespace stylish"' >> $config
    cat $config 2>/dev/null
  fi

  echo -e "\n${alert}==> ${notice}NOTE: nodeJS users${reset}"
  echo -e "  Add to ${fail}package.json${reset}"
  echo -e "    ${invert}  ""\"scripts""\": {${reset}"
  echo -e "    ${invert}    ""\"test""\": ""\"/path/to/validate.sh""\"${reset}"
  echo -e "    ${invert}  },${reset}"
  echo -e "${reset}  Then ${alert}\$${reset} ${warn}npm test${reset}\n"

  echo "USAGE: validate.sh [--version]"
  exit 1
fi

# Load config file
if [ -f "$config" ]; then
  echo -e "${alert}==>${reset} ${notice}Parsing ($config) config file${reset}"
  source "$config"
else
  echo -e "${warn}==>${reset} ${notice}Config file ($config) not found${reset}"
fi

# Run tests
parse_utils

### END ###
