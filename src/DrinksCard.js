import { useEffect, useState } from "react";
import CardWrapper from "./CardWrapper";

const DrinksCard = ({drink}) =>{
    const [flip, setFlip] = useState(false);
    const numStandards = ((((drink.total_volume * drink.pieces_per) * drink.alcohol_percent) / 17.05) / 100).toFixed(1) ;

    return(
        <>
            { drink &&
                <CardWrapper className='drinksCard flex flex-col items-center justify-center w-1/4 relative md:w-1/6' onMouseLeave={() => setFlip(false)} onMouseEnter={() => setFlip(true)}>
                    <div className={`flippableCard w-full h-full flex flex-col items-center justify-between text-clip text-center ${flip && 'flip'}`}>
                        <h2>{drink.drink_name}</h2>
                        <img src={drink.image_url}></img>
                        <span className="flex flex-row justify-between w-full"><h2>${parseFloat(drink.price).toFixed(2)}</h2><h2>{drink.alcohol_percent}%</h2> </span>
                    </div>
                {
                    flip && 
                    <div className="flippableCard absolute w-1/2 h-1/2 flex flex-col items-center justify-evenly text-clip text-center">
                        <h2>{drink.pieces_per} x {drink.total_volume}</h2>
                        <h2># Standard Drinks: {numStandards}</h2>
                    </div>
                }
                </CardWrapper>
            }
        </>
        
    );
}

export default DrinksCard;