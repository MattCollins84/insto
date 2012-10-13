#!/bin/bash
ssh ubuntu@ec2-176-34-91-164.eu-west-1.compute.amazonaws.com "cd ~/insto; git pull; npm install; forever stop insto.js; forever start insto.js"
