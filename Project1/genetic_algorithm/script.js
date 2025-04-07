const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const answerInputLength = document.getElementById('answerInputLength');
const answerInputWay = document.getElementById('answerInputWay');

let points = [];
let currentPopulation = [];
let potentialBestResult = Number.MAX_VALUE;
let globalPressing = false;

let POPULATION_SIZE = 100;
let PERCENTAGE_MUTATION = 5;
let COUNT_GENERATIONS = 10000;

canvas.addEventListener('click', (event) => {
	potentialBestResult = Number.MAX_VALUE;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    points.push({ x: x, y: y });
    drawPoints();
});

function generateStartPopulation() {
    const basis = [];
    for (let i = 0; i < points.length; i++) {
        basis.push(i);
    }
    currentPopulation.push({ wayLength: getWayLength(basis), way: basis });

    for (let i = 0; i < POPULATION_SIZE; i++) {
        const individ = [...basis];
        for (let j = 0; j < points.length; j++) {
            let a = Math.floor(Math.random() * (points.length-1))+1;
            let b = Math.floor(Math.random() * (points.length-1))+1;
            while (a == b) {
            	b = Math.floor(Math.random() * (points.length-1))+1;
            }
            [individ[a], individ[b]] = [individ[b], individ[a]];
        }
        currentPopulation.push({ wayLength: getWayLength(individ), way: individ });
    }
}

function getWayLength(individ) {
	let wayLength = 0;
	for (let i = 0; i < points.length-1; i++) {
		wayLength += distance(points[individ[i]], points[individ[i+1]]);
	}
	return wayLength;
}

function distance(pointA, pointB) {
	return Math.sqrt(Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2));
}

function reproduce() {
    let maleIndex = Math.floor(Math.random() * currentPopulation.length);
    let femaleIndex = Math.floor(Math.random() * currentPopulation.length);
    while (maleIndex === femaleIndex) {
        femaleIndex = Math.floor(Math.random() * currentPopulation.length);
    }

    const male = currentPopulation[maleIndex].way;
    const female = currentPopulation[femaleIndex].way;

    let child1 = [];
    let child2 = [];
    let inheritedGenesCh1 = [];
    let inheritedGenesCh2 = [];

    let breakPoint = Math.floor(Math.random() * (male.length-1))+1;

    for (let i = 0; i < breakPoint; i++) {
        child1[i] = male[i];
        inheritedGenesCh1.push(male[i]);
        child2[i] = female[i];
        inheritedGenesCh2.push(female[i]);
    }

    fillChild(child1, female, inheritedGenesCh1);
    fillChild(child2, male, inheritedGenesCh2);

    child1 = mutation(child1);
    child2 = mutation(child2);

    currentPopulation.push({ wayLength: getWayLength(child1), way: child1 });
    currentPopulation.push({ wayLength: getWayLength(child2), way: child2 });

    currentPopulation.sort((a, b) => a.wayLength - b.wayLength);
    
    currentPopulation.pop();
    currentPopulation.pop();
}

function fillChild(child, otherParent, inheritedGenes) {
    for (let gene of otherParent) {
        if (!inheritedGenes.includes(gene)) {
            child.push(gene);
        }
    }

    while (child.length < otherParent.length) {
        for (let gene of otherParent) {
            if (!child.includes(gene)) {
                child.push(gene);
                if (child.length === otherParent.length) break;
            }
        }
    }
}

function mutation(individ) {
    const isMutate = (Math.floor(Math.random() * 100) < PERCENTAGE_MUTATION);
    if (isMutate) {
        let a = Math.floor(Math.random() * (individ.length-1))+1;
        let b = Math.floor(Math.random() * (individ.length-1))+1;
        
        [individ[a], individ[b]] = [individ[b], individ[a]];
    }

    return individ;
}

function findBestWay() {
    let BestWaysInTime = 0;
    globalPressing = true;
    while (BestWaysInTime < 10) {

	currentPopulation = []
	generateStartPopulation();

	for (let i = 0; i < COUNT_GENERATIONS; i++) {
		reproduce();

		pts = currentPopulation[0].way;
	}

    

	if (currentPopulation[0].wayLength < potentialBestResult) {
		console.log(currentPopulation[0].wayLength);
		pts = currentPopulation[0].way;
		pts.forEach((pt) => {
	  		console.log(pt);
		});

		drawPoints();
		drawWay(pts);

		answerInputLength.textContent = 
		"Текущая длина потенциально лучшего пути коммивояжера: " + currentPopulation[0].wayLength;

		let waY = ""
		pts = currentPopulation[0].way;
		pts.forEach((pt) => {
	  		waY += pt;
	  		waY += " ";
		});

		answerInputWay.textContent =
		"Текущий потенциально лучший путь коммивояжера: " + waY;	

		potentialBestResult = currentPopulation[0].wayLength;

        BestWaysInTime = 0;
	} else {
        console.log("Лучше пути не найдено :(");
        BestWaysInTime++;
    }

    }
    globalPressing = false;
}

function drawWay(way) {
	point = points[way[0]]

	ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    way.forEach((index, i) => {
        const point = points[index];
        if (i === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });
    
    ctx.lineTo(points[way[0]].x, points[way[0]].y);
    ctx.stroke();
}

function sleep(millis) {
    var t = (new Date()).getTime();
    var i = 0;
    while (((new Date()).getTime() - t) < millis) {
        i++;
    }
}

document.getElementById('clusterButton').addEventListener('click', () => {
    if (globalPressing == false) {
        findBestWay();
    }
});

function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points.forEach(point => {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}