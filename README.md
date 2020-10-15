# KMB & LWB combined headway ETA
This is an interface for the KMB / LWB ETA API which allows choosing a stop,
and shows the ETA of the upcoming 3 departures combined from a set of routes
serving the stop.

[There is also a sister project for Citybus & NWFB available.](https://github.com/miklcct/ctb-nwfb-combined-headway-eta)

## Features
* ETA automatically refreshes every 15 seconds.

* Direct bookmark and load a specified combination of routes at a certain stop.

* The existing combination is preserved when a route serving the same stop is entered.

  For example, if routes 258D and 259D at Tuen Mun Road Interchange is already chosen,
  typing 61X into the route selection box will add 61X into the chosen combination
  with the correct direction automatically selected.
  
  Limitation: if the newly-added route serves the stop in both directions (e.g. 64K @ Kam Sheung Road Station),
  or passing through the same stop in the same direction twice (e.g. 54 @ Kam Sheung Road Station),
  only one of the stop will be automatically added. You can choose the alternatives manually.
  
* The existing combination is preserved when another stop with the same combination in the same direction is chosen.

  For example, if you have selected routes 61X, 258, 259D at Beacon Heights,
  choosing Wong Tai Sin Station from the stop list now will still load the combination of 61X, 258D, 259D,
  choosing Millennium City from the stop list will load 258D, 259D because 61X do not serve the stop.
  
  Limitation: if the newly-chosen stop serves the same route in the same direction twice at the exact same pole,
  e.g. choosing 71S at Kwong Fuk Playground, then choose Tai Po Market Station (TA10-T-1250-0),
  both stopping of 71S at that same pole will be selected automatically.

## Setting up the project
1. Run `npm install` to install the dependencies
2. Run `npm run snowpack dev` to start a development server at `http://localhost:8080`
3. When ready for deployment, run `npm run snowpack build` to compile the Javascript to be served
4. Copy all files inside `dist` folder to the document root of the web server to deploy
or run `index.html` directly in the browser without a web server.

## Usage
1. Enter the route number.
2. Change the direction and the variant.
3. Select a stop which you want to get the ETA.
4. A list of routes appear in the box below which serve the select stop.
Select the other routes you want to see at the same time as well.
Alternatively you may type in the other routes directly into the box as well.
5. The ETA appears at the stop, which automatically reloads after 15 seconds.
6. The URL is appended with a query string. You can bookmark that link such that the ETA
of the desired combination is shown directly without selecting again.

## Demo
[A demo instance is set up.](https://miklcct.com/kmb_eta/)

## Issues
* A proxy server is required to bypass the CORS restriction.
The proxy URL is defined in `scripts/Common.js`.
The address provided in the repository is a private proxy server which can only be used to 
query the KMB mobile API.

## Acknowledgement
This project is possible only when given the knowledge of how the mobile API works,
which is studied as
[a final year project by HKU CS student Wong San Yu](https://i.cs.hku.hk/fyp/2018/report/final_report/Wong%20San%20Yu_12307104_assignsubmission_file_/final-report-revised.pdf),
with a working Android implementation [BusETA](https://github.com/alvinhkh/buseta) by AlvinHKH.