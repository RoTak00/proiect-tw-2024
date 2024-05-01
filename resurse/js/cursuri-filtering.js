var filters = [];
var courseList = null;

$(document).ready(function () {
  courseList = $(".course");
  $(
    ".filter-element input[type='text'], .filter-element input[type='number'], .filter-element input[type='range'], .filter-element textarea"
  ).on("change", function () {
    let filter = $(this).data("filter");
    let value = $(this).val();

    if (value.length > 0) {
      filters[filter] = value.toLowerCase().trim();
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

  $(".filter-element input[type='radio']").on("change", function () {
    let filter = $(this).data("filter");
    let value = $(this).val();

    if ($(this).is(":checked")) {
      filters[filter] = value;
    }

    if (!value) {
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

  // sortare

  $("#button-sort").on("click", function () {
    let current_state = $(this).attr("data-sort");

    if (current_state == "asc") {
      current_state = "desc";
      $(this).find("i").removeClass("fa-angles-up").addClass("fa-angles-down");
    } else {
      current_state = "asc";
      $(this).find("i").removeClass("fa-angles-down").addClass("fa-angles-up");
    }

    $(this).attr("data-sort", current_state);
    sortCourses(current_state);
  });

  $(document).on("click", "#button-reset", function () {
    $("#modal-reset")[0].showModal();
  });

  $(document).on("click", "#reset-close", function () {
    $("#modal-reset")[0].close();
  });

  $(document).on("click", "#reset-confirm", function () {
    $("#modal-reset")[0].close();
    filters = [];
    filterCoursesByFilter();

    // resetare

    $(
      ".filter-element input[type='text'], .filter-element input[type='number'], .filter-element input[type='range'], .filter-element textarea"
    ).val("");
    $(".filter-element input[type='checkbox']").prop("checked", false);
    $(".filter-element input[type='radio']").prop("checked", false);
    $(".filter-element select").val("");

    // fixare
    let min_price = $("#filter_max_price").attr("min");
    let max_price = $("#filter_max_price").attr("max");

    $("#filter_min_price").val(min_price);
    $("#filter_max_price").val(max_price);
    $("#fromInput").val(min_price);
    $("#toInput").val(max_price);
    $("#filter_rating_all").prop("checked", true);

    if ($("#button-sort").attr("data-sort") == "desc") {
      $("#button-sort")
        .find("i")
        .removeClass("fa-angles-down")
        .addClass("fa-angles-up");
      $("#button-sort").attr("data-sort", "asc");
      sortCourses("asc");
    }
  });

  $(document).on("click", "#button-calculate", function () {
    $("#modal-calculate strong").text(calculateOpenCoursesPrice() + " RON");
    $("#modal-calculate")[0].showModal();

    setTimeout(function () {
      $("#modal-calculate")[0].close();
    }, 3000);
  });

  $(document).on("click", "#calculate-close", function () {
    $("#modal-calculate")[0].close();
  });
});

function calculateOpenCoursesPrice() {
  let price = 0;

  let courseList = $(".course");

  courseList.each(function () {
    let course = $(this);

    let priceElement = course.find('[data-element="pret"]');
    let priceValue = priceElement.data("key");

    price += parseInt(priceValue);
  });

  return price;
}

function sortCourses(current_state) {
  let courses_wrapper = $(".grid-courses");

  let courses = courses_wrapper.children(".course");

  courses
    .sort(function (a, b) {
      let price_a = $(a).find('[data-element="pret"]').data("key");
      let price_b = $(b).find('[data-element="pret"]').data("key");

      let ascdesc = current_state === "asc" ? 1 : -1;

      if (price_a * ascdesc > price_b * ascdesc) {
        return 1;
      }

      if (price_a * ascdesc < price_b * ascdesc) {
        return -1;
      }

      let name_a = $(a).find('[data-element="nume"]').text();
      let name_b = $(b).find('[data-element="nume"]').text();

      if (ascdesc == 1 && name_a > name_b) {
        return 1;
      }

      if (ascdesc == -1 && name_a < name_b) {
        return 1;
      }

      if (ascdesc == 1 && name_a < name_b) {
        return -1;
      }

      if (ascdesc == -1 && name_a > name_b) {
        return -1;
      }

      return 0;
    })
    .each(function () {
      courses_wrapper.append(this);
    });
}

function filterCoursesByFilter() {
  console.log(filters);

  courseList.hide();

  courseList
    .filter(function () {
      for (let filter_key in filters) {
        let filter_value = filters[filter_key];

        filter_value = removeAccents(filter_value);

        // pentru situatii cum ar fi pret_minim, pret_maxim
        let target_element_key = filter_key.split("_")[0];
        let target_element = $(this).find(
          `[data-element='${target_element_key}']`
        );

        switch (filter_key) {
          // daca nu se potriveste numele
          case "nume":
            if (
              removeAccents(target_element.text())
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
                .includes(removeAccents(target_element.text()).toLowerCase())
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

          case "luna_start_special":
            if (
              new Date(target_element.attr("datetime")) >
              new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                new Date().getDate()
              )
            )
              return false;
            break;

          case "rating":
            if (
              parseInt(target_element.attr("data-key")) < parseInt(filter_value)
            ) {
              return false;
            }
            break;

          case "locatie":
            if (
              !filter_value
                .toLowerCase()
                .trim()
                .includes(target_element.text().toLowerCase().trim())
            ) {
              return false;
            }
            break;

          case "descriere":
            if (
              !removeAccents(target_element.text())
                .toLowerCase()
                .trim()
                .includes(filter_value.toLowerCase().trim())
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

function removeAccents(str) {
  // Normalize the string to decompose accented characters
  const normalizedStr = str.normalize("NFD");

  // Use a regex to remove the combining diacritical marks
  const cleanedStr = normalizedStr.replace(/[\u0300-\u036f]/g, "");

  return cleanedStr;
}
