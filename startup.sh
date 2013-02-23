#!/bin/bash
cd ~/insto;
git pull;
npm install;
forever stop insto.js;
forever start insto.js;