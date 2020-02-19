# Citybus & NWFB combined headway ETA
This is an interface for the Citybus / NWFB ETA API which allows choosing a stop,
and shows the ETA of the upcoming 3 departures combined from a set of routes
serving the stop.

## Features
* ETA automatically refreshes every 15 seconds.

* Direct bookmark and load a specified combination of routes at a certain stop.

* The existing combination is preserved when a route serving the same stop is entered.

  For example, if routes 970 and 970X at Hill Road is already chosen,
  typing 973 into the route selection box will add 973 into the chosen combination
  with the correct direction automatically selected.
  
  Limitation: if the newly-added route serves the stop in both directions (e.g. 702A @ Fu Cheong Estate),
  or passing through the same stop in the same direction twice (e.g. 701 @ Fu Cheong Estate),
  only one of the stop will be automatically added. You can choose the alternatives manually.
  
* The existing combination is preserved when another stop with the same combination in the same direction is chosen.

  For example, if you have selected routes 6, 6A, 6X, 260 at Stanley bus terminus,
  choosing Repulse Bay (to Central) from the stop list now will still load the combination of 6, 6A, 6X, 260,
  choosing Chung Hom Kok from the stop list will load 6, 6X because 6A and 260 do not serve the stop.
  
  Limitation: if the newly-chosen stop serves the same route in the same direction twice,
  e.g. choosing 701 at Mong Kok Market first, then choose Fu Cheong Estate,
  both stopping of 701 will be selected automatically; if the original stop serves the same route
  in the same direction twice, it will not be automatically selected when another stop is selected,
  e.g. choosing any of the 701 at Fu Cheong Estate first, then choose Mong Kok Market, no 701 is selected automatically.


## Installation
No installation is needed. Clone the repository and open `index.xhtml`.
It runs fully within the browser.

## Usage
1. Enter the route number or select a route from the list.
2. Change the direction and the variant.
3. Select a stop which you want to get the ETA.
4. A list of routes appear in the box below which serve the select stop.
Select the other routes you want to see at the same time as well.
Alternatively you may type in the other routes directly into the box as well.
5. The ETA appears at the stop, which automatically reloads after 15 seconds.
6. The URL is appended with a query string. You can bookmark that link such that the ETA
of the desired combination is shown directly without selecting again.

## Demo
[A demo instance is set up.](https://miklcct.com/nwfb_eta)

## Issues
* A proxy server is required to bypass the CORS restriction.
The proxy URL is defined in `scripts/Common.js`.
The address provided in the repository is a private proxy server which can only be used to 
query the NWFB mobile API.

## Acknowledgement
This project is possible only when given the knowledge of how the mobile API works,
which is studied as
[a final year project by HKU CS student Wong San Yu](https://i.cs.hku.hk/fyp/2018/report/final_report/Wong%20San%20Yu_12307104_assignsubmission_file_/final-report-revised.pdf),
with a working Android implementation [BusETA](https://github.com/alvinhkh/buseta) by AlvinHKH.