# Citybus & NWFB combined headway ETA
This is an interface for the Citybus / NWFB ETA API which allows choosing a stop,
and shows the ETA of the upcoming 3 departures combined from a set of routes
serving the stop.

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
Known issues related to the deficiency of the Citybus / NWFB ETA API 
is listed on [GitHub](https://github.com/miklcct/ctb-nwfb-combined-headway-eta/issues/1).