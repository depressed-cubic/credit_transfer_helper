async function main() {

    const data = await fetch(chrome.runtime.getURL('../data/stuff.json')).then((response) => response.json())

    let boxes = document.querySelectorAll(".ui--icon-box-content")

    let codeMap = new Object()

    let nameMap = new Object()

    /**
     * return an array of ust equivalent of the course, consider said uni through virtual study as well, null if not found
     * @param {string} uni name of the university without weird stuff like (Academic) 
     * @param {string} code source course code
     * @param {string} name source course name
     * @returns array of object with property `code`, `name`, `credits` (can be empty)
     */
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
/*
    function insertContent(row, mapped_courses) {
       /* 
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
        const hostCourse = new Object()
        hostCourse["code"] = row.children[0].textContent
        hostCourse["name"] = row.children[1].textContent

        const kek = new MappingDisplay(hostCourse, mapped_courses)
    }*/

    class MappingTile{
        source;
        mapsto = [];
        mainDiv;

        /**
         * 
         * @param {{code: string, name: string}} source 
         * @param {{code: string, name: string, credits: string}[]} mapped_courses 
         */
        constructor (source, mapped_courses) {
            this.mainDiv = document.createElement("div")
            this.mainDiv.classList.add("course-mapping")
            this.source = source
            this.mapsto = mapped_courses

            this.update()
        }

        #courseTile(className, showCredits = false) {
            const div = document.createElement("div")
            div.classList.add(className + "-course-tile")
            div.appendChild(document.createElement("div"))
            div.appendChild(document.createElement("div"))
            div.children[0].classList.add(className + "-course-code")
            div.children[1].classList.add(className + "-course-name")
            if (showCredits) {
                div.appendChild(document.createElement("div"))
                div.children[2].classList.add(className + "-course-credits")
            }
            return div
        }

        update() {
            this.mainDiv.appendChild(this.#courseTile("host"))

            const hostCourseCode = this.mainDiv.children[0].children[0]
            hostCourseCode.textContent = this.source.code
            
            const hostCourseName = this.mainDiv.children[0].children[1]
            hostCourseName.textContent = this.source.name
            
            this.mainDiv.appendChild(document.createElement("div"))
            this.mainDiv.children[1].classList.add("mapped-courses")
        
            if (this.mapsto == undefined) {
                const div = document.createElement("div")
                div.textContent = "no existing mapping"
                this.mainDiv.appendChild(div)
                return
            }
            this.mapsto.forEach(c => {

                const mappedCourseDiv = this.#courseTile("mapped", true)
                const arrow = document.createElement("div")
                arrow.classList.add("arrow")
                arrow.textContent = "=>"
                mappedCourseDiv.children[0].before(arrow)

                const code = mappedCourseDiv.children[1]
                code.textContent = c.code

                const name = mappedCourseDiv.children[2]
                name.textContent = c.name

                const credits = mappedCourseDiv.children[3]
                credits.textContent = c.credits
                
                this.mainDiv.children[1].appendChild(mappedCourseDiv)
            })
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

                const newContainer = document.createElement("div")
            
                rows.forEach((row) => {
                    const hostCourse = new Object()
                    hostCourse["code"] = row.children[0].textContent
                    hostCourse["name"] = row.children[1].textContent

                    const ustCourses = course_mapper(uni, hostCourse["code"], hostCourse["name"])

                    const kek = new MappingTile(hostCourse, ustCourses)
                    newContainer.appendChild(kek.mainDiv)
                })

                courses.after(newContainer)

                courses.remove()
            }
        }
    }

    boxes.forEach((box) => boxHandler(box))

    Promise.resolve("done")
}

main().then((kek) => console.log(kek)).catch((e) => console.log(e))