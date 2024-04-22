var filters = [];
var courseList = null;

$(document).ready(function () {
  courseList = $(".course");
  $(
    ".filter-element input[type='text'], .filter-element input[type='number'], .filter-element input[type='range']"
  ).on("change", function () {
    let filter = $(this).data("filter");
    let value = $(this).val();

    if (value.length > 0) {
      filters[filter] = value;
    } else {
      delete filters[filter];
    }

    filterCoursesByFilter();
  });

  $(".filter-element input[type='checkbox']").on("change", function () {
    let filter = $(this).data("filter");
    let value = $(this).val();

    if (!filters[filter]) {
      filters[filter] = [];
    }

    if ($(this).is(":checked")) {
      filters[filter].push(value);
    } else {
      filters[filter] = filters[filter].filter((item) => item !== value);
    }

    if (filters[filter].length === 0) {
      delete filters[filter];
    }

    filterCoursesByFilter();
  });

  $(".filter-element select").on("change", function () {
    let filter = $(this).data("filter");
    let value = $(this).val();

    if (!filters[filter]) {
      filters[filter] = [];
    }

    filters[filter] = value;

    if (!value) {
      delete filters[filter];
    }

    filterCoursesByFilter();
  });
});

function filterCoursesByFilter() {
  console.log(filters);

  courseList.hide();

  courseList
    .filter(function () {
      for (let filter_key in filters) {
        let filter_value = filters[filter_key];

        // pentru situatii cum ar fi pret_minim, pret_maxim
        let target_element_key = filter_key.split("_")[0];
        let target_element = $(this).find(
          `[data-element='${target_element_key}']`
        );

        switch (filter_key) {
          // daca nu se potriveste numele
          case "nume":
            if (
              target_element
                .text()
                .toLowerCase()
                .indexOf(filter_value.toLowerCase()) < 0
            ) {
              return false;
            }
            break;
          case "categorie":
            if (
              !filter_value.includes(
                target_element.attr("data-key").toLowerCase()
              )
            ) {
              return false;
            }
            break;

          case "pret_minim":
            if (
              parseInt(target_element.attr("data-key")) < parseInt(filter_value)
            ) {
              return false;
            }
            break;

          case "pret_maxim":
            if (
              parseInt(target_element.attr("data-key")) > parseInt(filter_value)
            ) {
              return false;
            }
            break;

          case "tema":
            if (
              !filter_value
                .toLowerCase()
                .includes(target_element.text().toLowerCase())
            ) {
              return false;
            }
            break;

          case "luna_start":
            if (
              !filter_value.includes(
                parseInt(
                  target_element.attr("datetime").split("-")[1]
                ).toString()
              )
            ) {
              return false;
            }
            break;
        }
      }
      return true;
    })
    .show();
}
