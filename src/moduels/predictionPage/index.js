import React, {useContext, useEffect, useState} from "react";
import "./index.scss"
import logo from "../../img/polenAnalystLogo.svg";
import Spinner from "../../Spinner";
import getUserLocale from 'get-user-locale';
import {withLocalStorage} from "../../localStorage";
import {LocaleSelector} from "../LocaleSelector";
import {localized} from "../../localized";
import texts from './localized'
import LocaleContext from "../../LocaleContext";

function PredictPage(props) {

  const [imageTiles, setImageTiles] = useState([])
  const [faqExtended, setFaqExtended] = useState(false)
  const [chosenImage, setChosenImage] = useState(null)
  const [chosenImages, setChosenImages] = useState(null)
  const [chosenImagefiles, setChosenImageFiles] = useState(null)
  const [downloadedReport, setDownloadedReport] = useState(null)
  const [correctionCsv, setCorrectionCsv] = useState(null)
  const [chosenImageHidden, setChosenImageHidden] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [didFormReport, setDidFormReport] = useState(false);
  const [reportPDF, setReportPDF] = useState('');
  const [reportCSV, setReportCSV] = useState('');
  const [didDownloadCsv, setDidDownloadCsv] = useState(false);
  const [isReportCorrect, setIsReportCorrect] = useState(undefined);

  const {locale} = useContext(LocaleContext)



  function handleChange(selectorFiles) {
    setDidFormReport(false)
    let newImageTiles = []
    let filterSelectedFiles = Object.values(selectorFiles).filter(file => file.name.includes("jpg") || file.name.includes("png") || file.name.includes("jpeg") || file.name.includes("http"))
    setChosenImages(filterSelectedFiles.map(file => URL.createObjectURL(file)))
    setChosenImageFiles(filterSelectedFiles)
    for (let i = 0; i < filterSelectedFiles.length; i++) {
      newImageTiles.push(
        <div
          className={"image-tile"}
          key={filterSelectedFiles[i].name}
          onClick={() => {
            setChosenImage(i)
            setChosenImageHidden(false)
          }}
        >
          <img src={URL.createObjectURL(filterSelectedFiles[i])}/>
        </div>
      )
    }

    setImageTiles(newImageTiles)
  }

  function handleFolderClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.directory = true
    input.onchange = (e) => {
      const files = e.target.files;
      handleChange(files);
    };
    input.click();
  }

  const userLocale = getUserLocale();
  const documentLocale = userLocale.includes('ru') ? 'ru' : 'en'

  function predict() {
    document.getElementById('selectedFile').value = null
    setDidDownloadCsv(false)
    setIsReportCorrect(undefined)
    if (!chosenImages || !chosenImages.length) {
      return
    }
    setIsLoading(true)
    const API_ENDPOINT = `https://ctlab.itmo.ru/nkhanzhina/predict?locale=${documentLocale}`;
    const downloadUrl = `https://ctlab.itmo.ru/nkhanzhina/download?locale=${documentLocale}&path=`
    const request = new XMLHttpRequest();
    const formData = new FormData();


    request.open("POST", API_ENDPOINT, true);
    request.onreadystatechange = () => {
      setIsLoading(false)
      if (request.readyState === 4 && request.status === 200) {
        let responseJson = JSON.parse(request.responseText)
        let newImageTiles = []
        setChosenImages(responseJson.images_with_bboxes.map(url => {
          console.log(downloadUrl+url)
          return (downloadUrl+url)
        }))
        responseJson.images_with_bboxes.forEach((imageUrl, index) => {
          newImageTiles.push(
            <div
              className={"image-tile"}
              key={imageUrl}
              onClick={() => {
                setChosenImage(index)
                setChosenImageHidden(false)
              }}
            >
              <img src={downloadUrl + imageUrl}/>
            </div>
          )
        })
        setImageTiles(newImageTiles)
        setDidFormReport(true)
        setReportPDF(downloadUrl + responseJson.report)
        setReportCSV(downloadUrl + responseJson.csv)
      }
    };

    for (let i = 0; i < chosenImagefiles.length; i++) {
      formData.append(`file${i}.png`, chosenImagefiles[i]);
    }
    request.send(formData);
  }

  const downloadPDF = () => {
    window.open(reportPDF, '_blank')
  }

  const downloadCSV = () => {
    window.open(reportCSV, '_blank')
    setDidDownloadCsv(true)
  }

  const aproveCsv = () => {
    const API_ENDPOINT = `https://ctlab.itmo.ru/nkhanzhina/accept?report=${reportCSV.split('/')[reportCSV.split('/').length-1]}`;
    const request = new XMLHttpRequest();

    request.open("POST", API_ENDPOINT, true);
    request.onreadystatechange = () => {
      setIsReportCorrect(true)
    }

    request.send();
  }

  const disaproveCsv = () => {
    setIsReportCorrect(false)
  }

  const correctCsv = (correctionCsv) => {
    if(!correctionCsv.length){
      return
    }
    const API_ENDPOINT = `https://ctlab.itmo.ru/nkhanzhina/upload?report=${correctionCsv[0].name}`;
    const request = new XMLHttpRequest();
    const formData = new FormData();

    request.open("POST", API_ENDPOINT, true);
    request.onreadystatechange = () => {
      setIsLoading(false)
      if (request.readyState === 4 && request.status === 200) {
        console.log('corrected')
        setIsReportCorrect(true)
      }
    };
    console.log(correctionCsv[0])
    formData.append('file', correctionCsv[0]);

    request.send(formData);
    // request.send();
  }


  useEffect(() => {

    const onKeydown = (event) => {
      if(event.key === 'ArrowRight' && chosenImages !== null) {
        if(chosenImages.length > chosenImage+1) {
          setChosenImage(chosenImage+1)
        }
      }
      if(event.key === 'ArrowLeft' && chosenImages !== null) {
        if(chosenImage-1 >= 0) {
          setChosenImage(chosenImage-1)
        }
      }
    }


    window.document.removeEventListener('keydown', onKeydown)
    window.document.addEventListener('keydown', onKeydown)
    return () => {
      window.document.removeEventListener('keydown', onKeydown)
    };
  }, [chosenImages, chosenImage]);


  return (
    <div className={"predict-page"}>

      {chosenImageHidden ? null :
        <button
          className={"hide"}
          onClick={() => {
            setChosenImageHidden(true)
          }}
        />
      }
      <img
        key={chosenImage !== null ? chosenImages[chosenImage] : ""}
        src={chosenImage !== null ? chosenImages[chosenImage] : ""}
        className={"chosen-image" + (chosenImageHidden ? " hidden" : "")}
      />

      <img className={"logo"} height={"80px"} src={logo}/>
      <div
        className={"faq" + (faqExtended ? " extended" : "")}
        onClick={() => setFaqExtended(!faqExtended)}
      >
        <div className={"overlay" + (faqExtended ? " extended" : "")}>
          ?
        </div>
        <div className={"body"}>
          {localized(texts['faq1'], locale)}
        </div>
        <div className={"title"}>
          {localized(texts['faq2'], locale)}
        </div>
        <div className={"body"}>
          {localized(texts['faq3'], locale)}
        </div>
        <div className={"title"}>
          {localized(texts['faq4'], locale)}
        </div>
        <div className={"body"}>
          {localized(texts['faq5'], locale)}
        </div>
      </div>
      <div className={'controls-strip'}>
        <button
          className={"action-button logout"}
          onClick={() => {
            withLocalStorage({password: ''}, 'save')
            withLocalStorage({login: ''}, 'save')
            window.location.reload()
          }}
        >
          <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.72382 18.2962H11.72C12.6316 18.2962 13.3152 18.0665 13.771 17.6072C14.2268 17.1478 14.4547 16.455 14.4547 15.529V11.6766H12.8812V15.5073C12.8812 15.898 12.7763 16.2 12.5665 16.4134C12.3567 16.6269 12.0492 16.7336 11.6441 16.7336H2.81063C2.39826 16.7336 2.08718 16.6269 1.87738 16.4134C1.66758 16.2 1.56268 15.898 1.56268 15.5073V2.78892C1.56268 2.39826 1.66758 2.09622 1.87738 1.8828C2.08718 1.66937 2.39826 1.56266 2.81063 1.56266H11.6441C12.0492 1.56266 12.3567 1.66937 12.5665 1.8828C12.7763 2.09622 12.8812 2.39826 12.8812 2.78892V6.61963H14.4547V2.76723C14.4547 1.84844 14.2268 1.15753 13.771 0.694519C13.3152 0.231507 12.6316 0 11.72 0H2.72382C1.81226 0 1.1304 0.231507 0.678247 0.694519C0.226082 1.15753 0 1.84844 0 2.76723V15.529C0 16.455 0.226082 17.1478 0.678247 17.6072C1.1304 18.0665 1.81226 18.2962 2.72382 18.2962Z" fill="#FF0000"/>
            <path d="M8.11696 9.9186H16.5922L17.8836 9.85348L17.3953 10.3201L16.1039 11.5138C15.952 11.644 15.876 11.8177 15.876 12.0347C15.876 12.2373 15.9393 12.4055 16.0659 12.5393C16.1926 12.6732 16.3535 12.7401 16.5488 12.7401C16.7369 12.7401 16.907 12.6641 17.0589 12.5122L19.7393 9.71242C19.8406 9.61114 19.9093 9.51708 19.9455 9.43026C19.9817 9.34345 19.9998 9.2494 19.9998 9.14812C19.9998 9.04683 19.9817 8.95279 19.9455 8.86598C19.9093 8.77915 19.8406 8.6851 19.7393 8.58381L17.0589 5.78404C16.907 5.63212 16.7369 5.55615 16.5488 5.55615C16.3535 5.55615 16.1926 5.62126 16.0659 5.75148C15.9393 5.88171 15.876 6.0481 15.876 6.25067C15.876 6.47495 15.952 6.6522 16.1039 6.78242L17.3953 7.97612L17.8945 8.44275L16.5922 8.37764H8.11696C7.91439 8.37764 7.73894 8.4536 7.59063 8.60553C7.44232 8.75745 7.36816 8.93832 7.36816 9.14812C7.36816 9.35792 7.44232 9.53878 7.59063 9.69071C7.73894 9.84264 7.91439 9.9186 8.11696 9.9186Z" fill="#FF0000"/>
          </svg>
        </button>
        <LocaleSelector locales={['ru', 'en']}/>
      </div>
      <div className={"controls"}>
        <div className={"description"}>
          {localized(texts['topDescription'], locale)}
        </div>
        <input
          type="file"
          multiple
          id="selectedFile"
          style={{display: "none"}}
          onChange={(e) => handleChange(e.target.files)}
        />
      </div>
      <div className={"buttons"}>
        <button
          className={"action-button" + (imageTiles.length === 0 ? " active" : "")}
          onClick={() => document.getElementById('selectedFile').click()}
        >
          <div className={"inner-text"}>
            {imageTiles.length === 0 ?
              <>{localized(texts['chosePhoto'], locale)}</>
              :
              <>📷</>
            }
          </div>
        </button>
        {
          !imageTiles.length &&
          <button
            className={"action-button" + (imageTiles.length === 0 ? " active" : "")}
            onClick={handleFolderClick}
          >
            <div className={"inner-text"}>
              {localized(texts['choseFolder'], locale)}
            </div>
          </button>
        }
        <button
          className={"action-button" + ((imageTiles.length > 0 && !didFormReport) ? " active" : " passive")}
          style={!isLoading ? {width: '260px', height: '40.5px'}: {width: '40.5px', height: '40.5px'}}
          onClick={predict}
        >
          {isLoading ?
            <Spinner width={20}/>
            :
            <>{localized(texts['generate'], locale)}</>
          }
        </button>
        <button
          className={"action-button" + ((didFormReport && !didDownloadCsv) ? " active" : didDownloadCsv ? '': ' passive')}
          onClick={downloadPDF}
        >
          📥 PDF
        </button>
        <button
          className={"action-button" + ((didFormReport && !didDownloadCsv) ? " active" : didDownloadCsv ? '': ' passive')}
          onClick={downloadCSV}
        >
          📥 CSV
        </button>

        <button
          className={"action-button" + ((didDownloadCsv && (isReportCorrect === undefined)) ? ' active': ' passive')}
          onClick={aproveCsv}
        >
          {localized(texts['reportCorrect'], locale)}
        </button>
        <button
          className={"action-button" + ((didDownloadCsv && (isReportCorrect === undefined)) ? ' active': ' passive')}
          onClick={(disaproveCsv)}
        >
          {localized(texts['reportInCorrect'], locale)}
        </button>

        <input
          type="file"
          id="selectedCSV"
          style={{display: "none"}}
          onChange={(e) => correctCsv(e.target.files)}
        />
        <button
          className={"action-button" + ((didDownloadCsv && (isReportCorrect === false)) ? ' active': ' passive')}
          onClick={() => {
            document.getElementById('selectedCSV').click()
          }}
        >
          {localized(texts['correctCSV'], locale)}
        </button>
        <button
          className={"action-button" + ((didDownloadCsv && (isReportCorrect === true)) ? ' active': ' passive')}
          style={{backgroundColor: '#6dc244', color: 'white', border: 'none'}}
        >
          ✅ {localized(texts['thanks'], locale)}
        </button>
      </div>

      <div className={"images"}>
        {imageTiles}
      </div>
      {/*<div className={"buttons"}>*/}

      {/* */}
      {/*</div>*/}

    </div>
  )
}

export default PredictPage;
