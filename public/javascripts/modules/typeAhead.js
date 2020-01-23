const axios = require('axios');
// import axios from 'axios'; // we can do this also but we are using webpack to convert 'require' to convert to commonJS
import dompurify from 'dompurify';

function searchResultsHTML(stores) {
    return stores.map(store => {
        return `
            <a href="/store/${store.slug}" class="search__result">
                <strong>${store.name}</strong>
            </a>
        `;
    }).join('');   // this map will return an array and we really want a string
}

function typeAhead(search) {
    // console.log(search);
    if(!search) return;

    const searchInput = search.querySelector('input[name="search"]');
    const searchResults = search.querySelector('.search__results');

    // console.log(searchInput, searchResults);

    searchInput.on('input', function() {
        // console.log(this.value);

        // if there is no value, quit it!
        if(!this.value) {
            searchResults.style.display = 'none';
            return;
        }

        // show the search results!
        searchResults.style.display = 'block';

        axios
            .get(`/api/search?q=${this.value}`)
            .then(res => {
                // console.log(res.data); // type coffee in search bar
                if(res.data.length) {
                    // console.log('There is something to show!');
                    searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
                    return;
                }
                // tell them nothing came back
                searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for ${this.value} found!</div>`);

                // if we don't sanitize this then we are open to an XSS attack (Cross Site Scripting Attack)
                // While editing a store, if we enter the name of the store as follows - 
                // New Store <img src="http://localhost:7777/uploads/1b7870df-e238-4104-be4c-a267bd5f6257.jpeg" onload="alert('You got hacked')">
                // then save it and go to that store then it will show that alert and also it we search for this store like - 'new' in search bar then it will pop up the alert and show the image
                // This way we allowed somebody to put an image tag in the name
                
                // Before we embed any HTML in our website, we need to sanitize that data 
                // That's why we are using library called purify

                // It will still show the image if entered but it will take out the onload event
                // We can use other libraries to strip out the other data like images as well, before registering it to the database

            })
            .catch(err => {
                console.error(err);
            })
    })

    searchInput.on('keyup', (e) => {  // Search 'coffee' in search bar
        // if they aren't pressing up, down or enter, who cares!
        if(![38, 40, 13].includes(e.keyCode)){
            return; // nah
        }
        const activeClass =  'search__result--active';
        const current = search.querySelector(`.${activeClass}`);
        const items = search.querySelectorAll('.search__result');
        let next;
        if(e.keyCode == 40 && current) {
            next = current.nextElementSibling || items[0];
        } else if(e.keyCode === 40){
            next = items[0];
        } else if(e.keyCode === 38 && current) {
            next = current.previousElementSibling || items[items.length - 1];
        } else if(e.keyCode === 38) {
            next = items[items.length - 1];
        } else if(e.keyCode === 13 && current.href) {
            window.location = current.href;
            return;
        }

        if(current){
            current.classList.remove(activeClass);
        }
        // console.log(current, next);
        next.classList.add(activeClass);
    })
}

export default typeAhead;