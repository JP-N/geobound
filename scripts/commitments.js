let map;
let marker;

function initMap() {
    const defaultCenter = {lat: 41.661240, lng: -91.530128};

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: defaultCenter
    });

    // Add a click event to add a marker
    map.addListener('click', function (event) {
        placeMarker(event.latLng);
    });
}

function placeMarker(location) {
    if (marker) {
        marker.setMap(null);
    }
    marker = new google.maps.Marker({
        position: location,
        map: map
    });
    map.panTo(location);

    // Log the position of the marker
    console.log("Marker placed at:", location.lat(), location.lng());
}

document.addEventListener('DOMContentLoaded', function () {
    var saveButton = document.getElementById('saveTest');
    var checkInButtons = document.querySelectorAll('.btn-success');

    if (saveButton) {
        saveButton.addEventListener('click', function () {
            let commitmentName = document.getElementById('commitmentName').value;
            let commitmentLocation = document.getElementById('commitmentLocation') ? document.getElementById('commitmentLocation').value : null;
            console.log(commitmentName, commitmentLocation);
            // Check if a marker is placed
            if (!marker) {
                console.error("Please place a marker on the map.");
                return;
            }

            // Get lat and lng from the marker's position
            let lat = marker.getPosition().lat();
            let long = marker.getPosition().lng();

            let data = {
                commitment_name: commitmentName,
                lat: lat,
                long: long
            }

            fetch('/commitments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Success:', data);

                    // Now, you can access the commitment name, latitude, and longitude from the response data
                    let savedCommitmentName = data.commitment_name;
                    let savedLatitude = data.lat;
                    let savedLongitude = data.long;

                    console.log('Saved Commitment Name:', savedCommitmentName);
                    console.log('Saved Latitude:', savedLatitude);
                    console.log('Saved Longitude:', savedLongitude);

                    location.reload(); // Refreshes the page
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
        });

        // Event listener for "Check In" buttons
        checkInButtons.forEach(function (checkInButton) {
            checkInButton.addEventListener('click', function () {
                // Access commitment name, latitude, and longitude from the data-commitment attribute
                let commitmentData = JSON.parse(checkInButton.parentElement.getAttribute('data-commitment'));
                let commitmentName = commitmentData.commitment_name;
                let comLatitude = commitmentData.lat;
                let comLongitude = commitmentData.long;

                console.log('Commitment Name:', commitmentName);
                console.log('Commitment: Latitude:', comLatitude);
                console.log('Commitment: Longitude:', comLongitude);

                let userLat = 0;
                let userLon = 0;
                if ("geolocation" in navigator) {
                    // Prompt user for permission to access their location
                    navigator.geolocation.getCurrentPosition(
                        // Success callback function
                        (position) => {
                            // Get the user's latitude and longitude coordinates
                            userLat = position.coords.latitude;
                            userLon = position.coords.longitude;
                            console.log('User: Latitude:', userLat);
                            console.log('User: Longitude:', userLon);

                            //check if Within 0.5km
                            if(Math.abs(comLatitude-userLat) < 0.05 && Math.abs(comLongitude-userLon) < 0.05){
                                console.log('GOOD JOB!!!!!!');
                            }
                            else{
                                console.log('womp womp');
                            }

                        },
                        // Error callback function
                        (error) => {
                            // Handle errors, e.g. user denied location sharing permissions
                            console.error("Error getting user location:", error);
                        }
                    );
                } else {
                    // Geolocation is not supported by the browser
                    console.error("Geolocation is not supported by this browser.");
                }


            });
        });

        var listItems = document.querySelectorAll('.list-group-item');
        var addCommitmentModal = new bootstrap.Modal(document.getElementById('addCommitmentModal'));

        listItems.forEach(function (item) {
            item.addEventListener('click', function (e) {
                if (e.target.classList.contains('btn')) return;

                const data = e.currentTarget.getAttribute('data-commitment');
                if (e.currentTarget.hasAttribute('data-bs-target')) {
                    addCommitmentModal.show();
                } else if (data) {
                    document.querySelector('#modalContent').innerText = JSON.stringify(JSON.parse(data), null, 2);
                    var myModal = new bootstrap.Modal(document.getElementById('myModal'));
                    myModal.show();
                }
            });
        });
    }
});