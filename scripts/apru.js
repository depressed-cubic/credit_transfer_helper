async function main() {

    const data = chrome.storage.local

    let boxes = document.querySelectorAll(".ui--icon-box-content")

    const parser = new DOMParser()


    function isEmpty(object) {
        return Object.keys(object).length == 0
    }

    /**
     * return an array of ust equivalent of the course, consider said uni through virtual study as well, null if not found
     * @param {string} uni name of the university without weird stuff like (Academic) 
     * @param {string} code source course code
     * @param {string} name source course name
     * @returns array of object with property `code`, `name`, `credits`, `condition`, `virtual` (can be empty)
     */
    async function course_mapper(uni, code, name) {
        
        const result = []

        await Promise.allSettled([updateMapping(uni), updateMapping(uni + " through virtual study")])

        await data.get(uni + " through virtual study").then(r => {
            if (!isEmpty(r)) {

                const mappings = r[uni + " through virtual study"].mappings

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

        await data.get(uni).then(r => {
            if (!isEmpty(r)) {

                const mappings = r[uni + ""].mappings

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

        return result
        
        // getWholeList("Any","Any", "Nanyang Technological University").then(r => console.log(r))

    }
    

    async function updateMapping(uni) {

        const prev_result = await data.get(uni)
        if (!isEmpty(prev_result) && (Date.now() - prev_result[uni].time) <= 1000 * 3600) {
            return 
        }
        async function makeRequest(term = "Any", country = "Any", institution = "Any", subject = "Any", ustCourseCode = "Any", page = 1) {
            return chrome.runtime.sendMessage(`https://registry.hkust.edu.hk/ajax/results-institution?page=${page}&admission_term=${term}&institution=${institution.replaceAll(" ", "+")}&hkustsubject=${subject}&hkust_course_code=${ustCourseCode}&country_institution=${country}`)
            // fetch(
            //     `https://registry.hkust.edu.hk/ajax/results-institution?page=${page}&admission_term=${term}&institution=${institution.replaceAll(" ", "+")}&hkustsubject=${subject}&hkust_course_code=${ustCourseCode}&country_institution=${country}`, {
            //    "headers": { },
            //    "referrer": "https://registry.hkust.edu.hk/useful-tools/credit-transfer/database-institution/results-institution?page=1&institution_name=Any&admission_term=Any&hkust_subject=Any&hkust_course_code=Any&country_institution=Any",
            //    "method": "GET",
            //    "mode": "cors",
            // });
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
            let ok = await makeRequest(term, country, institution, subject, ustCourseCode, i)
            //     .then(r => {
                    // return r.text()
                // })
                .then(text => 
                parser.parseFromString(text, "text/html") ).then(doc => { 
                    resultParser(doc, result);
                    return doc
                })
                .then( doc => {
                    const stuff = doc.querySelectorAll(".result-count-results__num")
                    const cur = stuff[0].textContent.split("-")[1]
                    const end = stuff[1].textContent
                    // console.log(doc.querySelector(".result-count-container").textContent)
                    return Promise.resolve(cur == end)
                }
            )
            while (!ok){
                i++;
                ok = await makeRequest(term, country, institution, subject, ustCourseCode, i)
                // .then(r => {
                    // return r.text()
                // })
                .then(text => 
                parser.parseFromString(text, "text/html") ).then(doc => { 
                    resultParser(doc, result);
                    return doc
                })
                .then( doc => {
                    const stuff = doc.querySelectorAll(".result-count-results__num")
                    const cur = stuff[0].textContent.split("-")[1]
                    const end = stuff[1].textContent
                    // console.log(doc.querySelector(".result-count-container").textContent)
                    return Promise.resolve(cur == end)
                }
                )
            }
            return result
        }

        const result = await getWholeList("Any", "Any", uni)
        if (!(result.length == 0)) {
            let obj = {}
            obj[uni] = {mappings: result, time: Date.now()}
            await data.set(obj).then(() => {
                // console.log(`Mapping for ${uni} updated`)
                return Promise.resolve(1)
            }).catch((e) => console.log(e))
        } else {
            // console.log(`Mapping for ${uni} not found`)
        }
    }

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
        
            if (this.mapsto == undefined || this.mapsto.length == 0) {
                const div = document.createElement("div")
                div.textContent = "no existing mapping"
                this.mainDiv.appendChild(div)
                return
            }
            // console.log(`${this.source.code} => ${this.mapsto.toString()}`)
            this.mapsto.forEach(c => {

                // mapping info
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
                credits.textContent = c.credits.replace(" Credits", "")
                
                this.mainDiv.children[1].appendChild(mappedCourseDiv)

                // remarks

                const note = document.createElement("div")
                note.classList.add("mapping-note")
                if (c.virtual == false) {
                    let kek = document.createElement("div")
                    kek.classList.add("mapping-note-1")
                    kek.textContent = "non virtual mapping"
                    note.appendChild(kek)
                }
                let kek = document.createElement("div")
                kek.classList.add("mapping-note-2")
                kek.textContent = c.condition
                note.appendChild(kek)
                this.mainDiv.children[1].appendChild(note)
            })
        }

    }

    async function boxHandler(element) {
        // Find corresponding uni of the box
        let uni = element.children[0].textContent

        // Fix Uni name Format
        if (uni.includes("No additional fee")) {
            return 
        }
        uni = uni.replaceAll(/\(.+\)/g, "").trim()
        uni = uni.split(",")[0]
        // console.log(`getting value for ${uni}`)

        // Get course list
        let courses = element.querySelector("table")

        // Make sure there are courses
        if (courses != null) {
            let rows = [...courses.querySelectorAll("tr")]

            const newContainer = document.createElement("div")
        
            rows.forEach(async (row) => {
                const hostCourse = new Object()
                hostCourse["code"] = row.children[0].textContent
                hostCourse["name"] = row.children[1].textContent

                const ustCourses = await course_mapper(uni, hostCourse["code"], hostCourse["name"])

                const kek = new MappingTile(hostCourse, ustCourses)
                newContainer.appendChild(kek.mainDiv)
            })

            courses.after(newContainer)

            courses.remove()
        }
    }

    
    boxes.forEach((box) => boxHandler(box))

    // console.log(await data.get())
    Promise.resolve("done")
}

main().then((kek) => console.log(kek))