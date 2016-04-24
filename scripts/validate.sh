#!/bin/bash
##################
# validate.sh #######
version="1.0" #######
### Kevin Mittman ###
#####################

html=("index.html")
css=("style.css")
js=("app.js" "client.js")

checkdep() { type -p $1 &>/dev/null; }

alert="\e[1;34m"
notice="\e[1;39m"
warn="\e[1;33m"
fail="\e[1;31m"
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

parse_utils() {
  for cmd in $list; do
    if [ $cmd = "tidy" ]; then
      what="HTML"
      params="-qe"
      input="$html"
      run_utility
    elif [ "$cmd" = "csslint" ]; then
      what="CSS"
      params="--quiet"
      input="$css"
      run_utility
    elif [ "$cmd" = "jshint" ]; then
      what="Javascript"
      params=""
      input="$js"
      run_utility
    elif [ "$cmd" = "whitespace" ]; then
      what="Whitespace"
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

if [ -f ".webapp" ]; then
  echo -e "${alert}==>${reset} ${notice}Parsing ($PWD/.webapp) config file${reset}"
  source ".webapp"
else
  echo -e "${warn}==>${reset} ${notice}Config file ($PWD/.webapp) not found${reset}"
fi

list="jshint csslint tidy whitespace"
parse_utils

### END ###
