import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { Auto } from '../../interfaces/auto';
@Component({
  selector: 'app-search-bar',
  imports: [FaIconComponent],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
})
export class SearchBar {
  faMagnifyingGlass = faMagnifyingGlass;
  @Input() autos:Auto[]=[]
  @Output() onSelectCar=new EventEmitter<Auto>()
  selectedAutos: Auto[]=[]
  ngOnInit(){
    this.selectedAutos=this.autos   /*pour pouvoir afficher toutes les voitures*/
  }
  selectAutos(selectedBrand: string){
    if (selectedBrand ){
      this.selectedAutos=this.autos.filter(x=>x.brand.toLowerCase().startsWith(selectedBrand.toLowerCase()))/*filter est une fonction fléchée*/
    }
    else
      this.selectedAutos=this.autos
    
  }
  selectCar(auto: Auto){
    this.onSelectCar.emit(auto)
  }
}
