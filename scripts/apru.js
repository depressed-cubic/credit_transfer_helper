async function main() {

    const data = await fetch(chrome.runtime.getURL('../data/stuff.json')).then((response) => response.json())

    let boxes = document.querySelectorAll(".ui--icon-box-content")

    let codeMap = new Object()

    let nameMap = new Object()

    // return an array of ust equivalent of the course, consider said uni through virtual study as well, null if not found
    function course_mapper(uni, code, name) {
        /*
        if (data[uni + " through virtual study"][code] == null) {
            if (cache[uni] == null) {
                cache[uni] = new Object()
                Object.entries(data[uni + " through virtual study"]).forEach((arr) => {
                    cache[uni][arr[1]["name"]] = arr[1]["mapsto"]
                })
            }
            if (cache[uni][name] == null) {
                return ["No existing mapping", "", ""]
            } else {
                return cache[uni][name]
            }
        }
        return data[uni + " through virtual study"][code]["mapsto"]
        */
        if (codeMap[uni] == null) {
            codeMap[uni] = new Object()

            if (data[uni + " through virtual study"] != null){
                data[uni + " through virtual study"].forEach((mapping) => {

                    const hostCode = mapping["hostCourse"]["code"]

                    // not doing the mapping if the code is generic
                    if (hostCode != '#'){
                        if (codeMap[uni][hostCode] == null) {
                            codeMap[uni][hostCode] = []
                        }
                        mapping["ustEquiv"]["virtual"] = true 
                        codeMap[uni][hostCode].push(mapping["ustEquiv"])
                    }
                })
            }

            if (data[uni] != null) {
                data[uni].forEach((mapping) => {

                    const hostCode = mapping["hostCourse"]["code"]

                    // not doing the mapping if the code is generic
                    if (hostCode != '#'){
                        if (codeMap[uni][hostCode] == null) {
                            codeMap[uni][hostCode] = []
                        }
                        mapping["ustEquiv"]["virtual"] = false
                        codeMap[uni][hostCode].push(mapping["ustEquiv"])
                    }
                })
            }
        }

        if (codeMap[uni][code] != null) {
            return codeMap[uni][code]
        } 

        if (nameMap[uni] == null) {
            nameMap[uni] = new Object()

            if (data[uni + " through virtual study"] != null){
                data[uni + " through virtual study"].forEach((mapping) => {

                    const hostName = mapping["hostCourse"]["name"]

                    if (nameMap[uni][hostName] == null) {
                        nameMap[uni][hostName] = []
                        }
                        mapping["ustEquiv"]["virtual"] = true 
                        nameMap[uni][hostName].push(mapping["ustEquiv"])
                })
            }

            if (data[uni] != null) {
                data[uni].forEach((mapping) => {

                    const hostName = mapping["hostCourse"]["name"]

                    if (nameMap[uni][hostName] == null) {
                        nameMap[uni][hostName] = []
                        }
                        mapping["ustEquiv"]["virtual"] = false
                        nameMap[uni][hostName].push(mapping["ustEquiv"])
                })
            }
        }

        return nameMap[uni][name]

    }

    function insertContent(row, mapped_courses) {
        row.children[0].textContent = row.children[0].textContent + " " + row.children[1].textContent

        row.children[1].textContent = "=>"

        if (mapped_courses == null) {
            row.appendChild(document.createElement("td"))
            row.children[2].textContent = "No existing mapping"
        } else {
            for (course of mapped_courses) {
                row.appendChild(document.createElement("td")).textContent = course["code"] + " " + course["name"] + ((course["virtual"]) ? "" : " (not via virtual)")
            }
        }
    }

    function boxHandler(element) {
        // Find corresponding uni of the box
        let uni = element.children[0].textContent

        // Fix Uni name Format
        if (uni.slice(-" (VLC)".length) == " (VLC)") {
            uni = uni.slice(0, -6)
        }
        if (uni.slice(-" (Academic)".length) == " (Academic)") {
            uni = uni.slice(0, -11)
        }

        // Make sure actually is a uni in list
        if (data[uni + " through virtual study"] != null || data[uni] != null) {
            let courses = element.querySelector("table")

            // Make sure there are courses
            if (courses != null) {
                let rows = [...courses.querySelectorAll("tr")]
            
                rows.forEach((row) => {
                    
                    const hostCode = row.children[0].textContent
                    const hostName = row.children[1].textContent

                    const ustCourses = course_mapper(uni, hostCode, hostName)

                    insertContent(row, ustCourses)
                })
            }
        }
    }

    boxes.forEach((box) => boxHandler(box))

    Promise.resolve("done")
}

main().then((kek) => console.log(kek)).catch((e) => console.log(e))