$(document).ready(function () {
  const cardContainer = $("#card-container");

  // Fetch random products from the backend
  fetch("/api/random-products")
    .then((response) => response.json())
    .then((products) => {
      if (products.error) {
        console.error(products.error);
        return;
      }

      // Generate and inject cards for each product
      products.forEach((product, index) => {
        const card = `
          <div class="col-md-4 mb-4">
            <div class="card">
              <img src="/resized-images/400/cursuri/${product.imagine}" class="card-img-top" alt="${product.nume}">
              <div class="card-body">
                <h5 class="card-title">${product.nume}</h5>
                <p class="card-text">${product.descriere}</p>
                <a href="/cursuri/${product.id}" class="btn btn-primary">View Product</a>
              </div>
            </div>
          </div>
        `;
        cardContainer.append(card);
      });

      // Apply the staggered animation
      const cards = $(".card");
      const t = 100; // Delay in milliseconds

      cards.each(function (index) {
        setTimeout(() => {
          $(this).addClass("show");
        }, t * index);
      });
    })
    .catch((error) => {
      console.error("Error fetching random products:", error);
    });
});
