async function main() {

    const data = chrome.storage.local

    let boxes = document.querySelectorAll(".ui--icon-box-content")

    const parser = new DOMParser()

    /**
     * return an array of ust equivalent of the course, consider said uni through virtual study as well, null if not found
     * @param {string} uni name of the university without weird stuff like (Academic) 
     * @param {string} code source course code
     * @param {string} name source course name
     * @returns array of object with property `code`, `name`, `credits`, `condition`, `virtual` (can be empty)
     */

    function isEmpty(object) {
        return Object.keys(object).length == 0
    }

    async function course_mapper(uni, code, name) {
        
        const result = []

        await Promise.allSettled([updateMapping(uni), updateMapping(uni + " through virtual study")])

        data.get(uni + " through virtual study").then(r => {
            if (!isEmpty(r)) {

                const mappings = r[uni].mappings

                for (const mapping of mappings) {
                    if (mapping.hostCode === code || mapping.hostName === name) {
                        result.push({
                            code: mapping.ustCode,
                            name: mapping.ustName,
                            credits: mapping.credits,
                            condition: mapping.condition,
                            virtual: true
                        })
                    } 
                }
            }
        })

        data.get(uni).then(r => {
            if (!isEmpty(r)) {

                const mappings = r[uni].mappings

                for (const mapping of mappings) {
                    if (mapping.hostCode === code || mapping.hostName === name) {
                        result.push({
                            code: mapping.ustCode,
                            name: mapping.ustName,
                            credits: mapping.credits,
                            condition: mapping.condition,
                            virtual: false
                        })
                    } 
                }
            }
        })
        
        // getWholeList("Any","Any", "Nanyang Technological University").then(r => console.log(r))

    }
    

    async function updateMapping(uni) {

        const prev_result = await data.get(uni)
        if (!isEmpty(prev_result)) {
            if ((Date.now() - prev_result[uni].time) <= 1000 * 3600) {
                return 
            }
        }

        async function makeRequest(term = "Any", country = "Any", institution = "Any", subject = "Any", ustCourseCode = "Any", page = 1) {
            return fetch(
                `https://registry.hkust.edu.hk/ajax/results-institution?page=${page}&admission_term=${term}&institution=${institution.replace(" ", "+")}&hkustsubject=${subject}&hkust_course_code=${ustCourseCode}&country_institution=${country}`, {
               "headers": { },
               "referrer": "https://registry.hkust.edu.hk/useful-tools/credit-transfer/database-institution/results-institution?page=1&institution_name=Any&admission_term=Any&hkust_subject=Any&hkust_course_code=Any&country_institution=Any",
               "method": "GET",
               "mode": "no-cors",
               "credentials": "include"
            });
        }

        async function resultParser(doc, dest) {
            const tileList = doc.querySelectorAll(".tile-transfer")
            tileList.forEach(t => {
            
                const hName = t.querySelector(".tile-transfer__subject").textContent.trim().slice(2)
                const hCode = t.querySelector(".tile-transfer__ust-course-code").textContent.trim()
            
                const mapReq = t.querySelector(".tile-transfer__ribbon").textContent.trim()

                const ustName = t.querySelector(".tile-transfer__course-title").textContent.trim().slice(1).trim()
                const ustCode = t.querySelector(".tile-transfer__course-code").textContent.trim()
                const credits = t.querySelector(".tile-transfer__credits").textContent.trim()

                dest.push({
                    hostName: hName,
                    hostCode: hCode,
                    condition: mapReq,
                    ustName,
                    ustCode,
                    credits,
                })
            })
        }


        async function getWholeList(term = "Any", country = "Any", institution = "Any", subject = "Any", ustCourseCode = "Any") {
            const result = new Array()
            let i = 1
            let ok = await makeRequest(term, country, institution, subject, ustCourseCode, i).then(r => r.text()).then(text => {
                const doc = parser.parseFromString(text, "text/html")
                resultParser(doc, result)
                const stuff = doc.querySelectorAll(".result-count-results__num")
                const cur = stuff[0].textContent.split("-")[1]
                const end = stuff[1].textContent
                console.log(doc.querySelector(".result-count-container").textContent)
                return Promise.resolve(cur == end)
            })
            while (!ok){
                i++;
                ok = await makeRequest(term, country, institution, subject, ustCourseCode, i).then(r => r.text()).then(text => {
                    const doc = parser.parseFromString(text, "text/html")
                    resultParser(doc, result)
                    const stuff = doc.querySelectorAll(".result-count-results__num")
                    const cur = stuff[0].textContent.split("-")[1]
                    const end = stuff[1].textContent
                    console.log(doc.querySelector(".result-count-container").textContent)
                    return Promise.resolve(cur == end)
                })
            }
            return result
        }

        const result = await getWholeList("Any", "Any", uni)
        if (!(result.length == 0)) {
            await data.set({uni: {mappings: result, time: Date.now()}}).then(() => {
                console.log(`Mapping for ${uni} updated`)
                return Promise.resolve(1)
            }).catch((e) => console.log(e))
        } else {
            console.log(`Mapping for ${uni} not found`)
        }
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

    async function boxHandler(element) {
        // Find corresponding uni of the box
        let uni = element.children[0].textContent

        // Fix Uni name Format
        if (uni.slice(-" (VLC)".length) == " (VLC)") {
            uni = uni.slice(0, -6)
        }
        if (uni.slice(-" (Academic)".length) == " (Academic)") {
            uni = uni.slice(0, -11)
        }

        // Get course list
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

    boxes.forEach((box) => boxHandler(box))

    Promise.resolve("done")
}

main().then((kek) => console.log(kek)).catch((e) => console.log(e))