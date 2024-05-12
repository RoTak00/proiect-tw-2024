$(document).on("click", ".info-close", function (e) {
  $("#modal-course-info")[0].close();
});

$(document).on("click", ".course", function (e) {
  let element = $(this);

  let id = element.attr("data-id");

  fetch(`/api/curs/${id}`)
    .then((response) => response.json())
    .then((data) => {
      let course = data;
      console.log(course);

      $("#modal-info-course-name").text(course.nume);
      $("#modal-info-course-figure img").attr(
        "src",
        `/resized-images/500/cursuri/${course.imagine}`
      );
      $("#modal-info-course-figure source").attr(
        "src",
        `/resized-images/300/cursuri/${course.imagine}`
      );
      $("#modal-info-course-figure img").attr("alt", course.nume);
      $("#modal-info-course-figure img").attr("title", course.nume);

      $("#modal-info-course-category").text(course.categorie_text);

      $("#modal-info-course-price").text(`${course.pret} RON`);

      $("#modal-info-course-description").text(course.descriere);

      $("#modal-info-course-rating .fa-star").each((index, element) => {
        if (index < course.rating) {
          $(element).addClass("active");
        } else {
          $(element).removeClass("active");
        }
      });

      $("#modal-info-course-tema").text(course.tema_principala);

      $("#modal-info-course-locatie").text(course.locatie);

      $("#modal-info-course-data-start").text(course.data_start_text);

      $("#modal-info-course-accesibil-dizabilitati").text(
        course.accesibil_dizabilitati ? "Da" : "Nu"
      );

      $("#modal-info-course-button").attr("href", `/cursuri/${course.id}`);

      $("#modal-course-info")[0].showModal();
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});
