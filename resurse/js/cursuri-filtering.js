var filters = {};
var errors = [];
var sorting_keys = [];
var courseList = null;

$(document).ready(function () {
  courseList = $(".course");

  loadFiltersFromCookies();
  applyFiltersFromCookies();

  $(".filter-element").on("change", function () {
    checkFilterError();
    updateErrors();
    saveFiltersInCookies();
  });

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

    checkFilterError(filter, value);
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

    checkFilterError(filter, value);
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

    checkFilterError(filter, value);
    filterCoursesByFilter();
  });

  $(".filter-element select").on("change", function (e) {
    let filter = $(this).data("filter");
    let value = $(this).val();

    if (!filters[filter]) {
      filters[filter] = [];
    }

    filters[filter] = value;

    if (value == false) {
      delete filters[filter];
    }

    checkFilterError(filter, value);
    filterCoursesByFilter();
  });

  // Sorting
  $(".button-sort").on("click", function () {
    let current_state = $(this).attr("data-sort");

    if (current_state == "asc") {
      current_state = "desc";
      $(this).find("i").removeClass("fa-angles-up").addClass("fa-angles-down");
    } else {
      current_state = "asc";
      $(this).find("i").removeClass("fa-angles-down").addClass("fa-angles-up");
    }

    $(this).attr("data-sort", current_state);

    let parent_select = $(this).parents(".input-group").find("select");
    let priority = parent_select.attr("data-priority");
    let value = parent_select.val();

    sorting_keys[priority] = {
      value: value,
      state: current_state,
    };

    sortCourses();
    saveFiltersInCookies();
  });

  $(".select-sort").on("change", function () {
    let priority = $(this).attr("data-priority");
    let value = $(this).val();

    sorting_keys[priority] = {
      value: value,
      state: sorting_keys[priority] ? sorting_keys[priority].state : "asc",
    };

    sortCourses();
    saveFiltersInCookies();
  });

  initializeSort();

  $(document).on("click", "#button-reset", function () {
    $("#modal-reset")[0].showModal();
  });

  $(document).on("click", ".reset-close", function () {
    $("#modal-reset")[0].close();
  });

  $(document).on("click", "#reset-confirm", function () {
    $("#modal-reset")[0].close();
    filters = {};
    filterCoursesByFilter();

    // Reset filters
    $(
      ".filter-element input[type='text'], .filter-element input[type='number'], .filter-element input[type='range'], .filter-element textarea"
    ).val("");
    $(".filter-element input[type='checkbox']").prop("checked", false);
    $(".filter-element input[type='radio']").prop("checked", false);
    $(".filter-element select").val("");

    // Reset price range
    let min_price = $("#filter_max_price").attr("min");
    let max_price = $("#filter_max_price").attr("max");

    $("#filter_min_price").val(min_price);
    $("#filter_max_price").val(max_price);
    $("#fromInput").val(min_price);
    $("#toInput").val(max_price);
    $("#filter_rating_all").prop("checked", true);

    // Reset sorting
    if ($("#button-sort").attr("data-sort") == "desc") {
      $("#button-sort")
        .find("i")
        .removeClass("fa-angles-down")
        .addClass("fa-angles-up");
      $("#button-sort").attr("data-sort", "asc");
      sortCourses();
    }

    deleteAllCookies();
  });

  $(document).on("click", "#button-calculate", function () {
    $("#modal-calculate strong").text(calculateOpenCoursesPrice() + " RON");
    $("#modal-calculate")[0].showModal();

    setTimeout(function () {
      $("#modal-calculate")[0].close();
    }, 2000);
  });

  $(document).on("click", ".calculate-close", function () {
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

function sortCourses() {
  let courses_wrapper = $(".grid-courses");
  let courses = courses_wrapper.children(".course");

  courses
    .sort(function (a, b) {
      for (let key in sorting_keys) {
        let ascdesc = sorting_keys[key].state == "asc" ? 1 : -1;

        switch (sorting_keys[key].value) {
          case "nume":
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
            break;

          case "pret":
            let price_a = $(a).find('[data-element="pret"]').data("key");
            let price_b = $(b).find('[data-element="pret"]').data("key");

            if (price_a * ascdesc > price_b * ascdesc) {
              return 1;
            }

            if (price_a * ascdesc < price_b * ascdesc) {
              return -1;
            }
            break;

          case "rating":
            let rating_a = $(a).find('[data-element="rating"]').data("key");
            let rating_b = $(b).find('[data-element="rating"]').data("key");

            if (rating_a * ascdesc > rating_b * ascdesc) {
              return 1;
            }

            if (rating_a * ascdesc < rating_b * ascdesc) {
              return -1;
            }
            break;

          case "tema":
            let tema_a = $(a).find('[data-element="tema"]').text();
            let tema_b = $(b).find('[data-element="tema"]').text();

            if (ascdesc == 1 && tema_a > tema_b) {
              return 1;
            }

            if (ascdesc == -1 && tema_a < tema_b) {
              return 1;
            }

            if (ascdesc == 1 && tema_a < tema_b) {
              return -1;
            }

            if (ascdesc == -1 && tema_a > tema_b) {
              return -1;
            }
            break;

          case "descriere":
            let descriere_a = $(a).find('[data-element="descriere"]').text();
            let descriere_b = $(b).find('[data-element="descriere"]').text();

            if (ascdesc == 1 && descriere_a > descriere_b) {
              return 1;
            }

            if (ascdesc == -1 && descriere_a < descriere_b) {
              return 1;
            }

            if (ascdesc == 1 && descriere_a < descriere_b) {
              return -1;
            }

            if (ascdesc == -1 && descriere_a > descriere_b) {
              return -1;
            }
            break;
        }
      }
      return 0;
    })
    .each(function () {
      courses_wrapper.append(this);
    });
}

function filterCoursesByFilter() {
  if (errors.length > 0) {
    return;
  }

  courseList.hide();

  courseList
    .filter(function () {
      for (let filter_key in filters) {
        let filter_value = filters[filter_key];

        if (typeof filter_value === "string")
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

function checkFilterError() {
  errors = [];
  for (let filter_key in filters) {
    value = removeAccents(filters[filter_key]);
    switch (filter_key) {
      case "nume":
        if (/[^a-zA-Z0-9-_ ]/.test(value)) {
          errors.push({
            filter: filter_key,
            value: "Numele nu poate contine caractere speciale",
          });
        }

        if (value.length > 256) {
          errors.push({
            filter: filter_key,
            value: "Numele nu poate avea mai mult de 256 de caractere",
          });
        }
        break;

      case "pret_minim":
      case "pret_maxim":
        if (/[^0-9]/.test(value)) {
          errors.push({
            filter: filter_key,
            value: "Pretul nu poate contine caractere speciale",
          });
        }
        break;

      case "tema":
        if (/[^a-zA-Z0-9-_ ]/.test(value)) {
          errors.push({
            filter: filter_key,
            value: "Tema nu poate contine caractere speciale",
          });
        }

        if (value.length > 256) {
          errors.push({
            filter: filter_key,
            value: "Tema nu poate avea mai mult de 256 de caractere",
          });
        }

        let teme_existente = $("#filter_tema_datalist option")
          .map((index, element) => {
            return removeAccents($(element).attr("value").toLowerCase().trim());
          })
          .get();

        if (!teme_existente.includes(value)) {
          errors.push({
            filter: filter_key,
            value: "Tema selectata nu exista",
          });
        }
        break;
    }
  }
}

function updateErrors() {
  let errorsElement = $("#filter-errors");

  errorsElement.empty();

  if (errors.length > 0) {
    let errorContent = $("<ul></ul>");
    errors.forEach((error) => {
      errorContent.append(`<li class = 'text-danger'>${error.value}</li>`);
    });

    errorsElement.append(errorContent);
  }
}

function removeAccents(str) {
  // Normalize the string to decompose accented characters
  const normalizedStr = str.normalize("NFD");

  // Use a regex to remove the combining diacritical marks
  const cleanedStr = normalizedStr.replace(/[\u0300-\u036f]/g, "");

  return cleanedStr;
}

function initializeSort() {
  $(".select-sort").each((index, element) => {
    $(element).change();
  });
}

function saveFiltersInCookies() {
  const data = {
    filters: filters,
    sorting_keys: sorting_keys,
  };
  const dataJSON = JSON.stringify(data);
  setCookie("filter_sorting_data", dataJSON, 1); // Set the cookie for 1 day
}

function loadFiltersFromCookies() {
  const dataJSON = getCookie("filter_sorting_data");
  if (dataJSON) {
    const data = JSON.parse(dataJSON);
    filters = data.filters || {};
    sorting_keys = data.sorting_keys || [];
  }
}

function applyFiltersFromCookies() {
  // Apply filters
  for (let filter in filters) {
    const filterValue = filters[filter];
    const filterElement = $(`[data-filter='${filter}']`);

    if (Array.isArray(filterValue)) {
      filterValue.forEach((value) => {
        filterElement.filter(`[value='${value}']`).prop("checked", true);
      });
    } else {
      filterElement.val(filterValue);
    }
  }
  filterCoursesByFilter();

  // Apply sorting
  for (let key in sorting_keys) {
    const sortKey = sorting_keys[key];
    if (sortKey) {
      const selectElement = $(`select[data-priority='${key}']`);
      selectElement.val(sortKey.value);
      console.log(selectElement);
      const buttonElement = selectElement.siblings("div").find(".button-sort");
      console.log(buttonElement);
      buttonElement.attr("data-sort", sortKey.state);
      if (sortKey.state == "asc") {
        buttonElement
          .find("i")
          .removeClass("fa-angles-down")
          .addClass("fa-angles-up");
      } else {
        buttonElement
          .find("i")
          .removeClass("fa-angles-up")
          .addClass("fa-angles-down");
      }
    }
  }
  sortCourses();
}

function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = "expires=" + date.toUTCString();
  document.cookie = `${name}=${value}; ${expires}; path=/`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = name + "=; Max-Age=-99999999;";
}

function deleteAllCookies() {
  document.cookie.split(";").forEach(function (c) {
    document.cookie = c.trim().split("=")[0] + "=; Max-Age=-99999999;";
  });
}
