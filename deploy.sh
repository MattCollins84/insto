#!/bin/bash
ssh ubuntu@api.insto.co.uk "cd ~/insto; git pull; npm install; forever stop insto.js; forever start insto.js; cd ~/tweeter; forever stop tweeter.js; forever start tweeter.js"