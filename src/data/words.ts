// Kamusi ya Ubongo — curated Swahili lexicon (lowercase, a–z only).
// Expand freely: every game reads from LEXICON.

const RAW = `
mti mto jua kaa nzi mbu tai bei pua uzi taa saa mke mji bia ona oga uza lia vaa nje juu leo kwa mia uji ini jaa hai pia ila fua cha ana tia zaa kua nia ota oza oka uma ita iba lea paa nta ama una wao pole sasa maji kuku mama baba dada kaka bibi babu
moto joto chai embe wali nguo mkoba simu gari basi meli boti njia nchi taifa watu mtu kazi bado tena kila wote yote hodi poa leta weka toka rudi kata osha lipa tuma beba vuta gusa nusa onja anza piga soma imba pika lala enda sema taka jibu omba ruka
safi dawa homa afya saba nane tisa kumi tatu tano sita elfu laki pesa soko duka refu fupi mpya jana wiki siku pole meza kiti jiko kisu jani maua mawe jiwe nazi kobe paka mbwa bata papa ngao radi giza kiza taji
hewa ndoo kapu bafu choo soda nyanya dama sala dini deni kodi busu ndoa mume mzee hofu ziwa mvua mguu meno damu moyo kamba
simba tembo twiga ndege mbuzi mtoto shule barua dunia jambo mwezi nyota mlima pwani upepo ndizi papai ugali nyama mkate siagi pilau mboga tunda kiatu kofia shati kanga treni mgeni fundi sauti wimbo ngoma mpira amani imani akili ndoto fikra lugha ukuta moshi mkono jicho sikio mdomo ulimi tumbo ngozi mbili fedha benki ghali kubwa ndogo nzuri mbaya chafu kesho mwaka usiku jioni mbele nyuma chini ndani kando mbali kulia kweli uongo labda mambo panga jembe mbegu mtama viazi mnazi msitu nyasi chuma shaba nyoka punda panya njiwa nyuki mamba pweza dagaa ngisi picha rangi njano swali elimu chama ofisi faida nguvu bwana jamii cheza penda fanya cheka uliza shika funga ingia panda shuka choma nunua chora sikia ficha sahau amini ongea kuona kujua kukaa kuuza kuoga kuzaa mvuvi mwana mzazi nanga tanga bonde umeme ndugu jeshi pombe juisi chupa mfuko ngazi jengo redio video sanaa uzuri ujuzi uhuru umoja nguzo kalia tunza kiini hatua ishara mwili pamba asali bahari maziwa
kitabu habari rafiki safari asante karibu bahati sukari kahawa nanasi samaki baridi mjomba jirani askari dereva mpishi furaha upendo kalamu mlango sahani nywele kichwa rahisi mchana haraka shamba mchele mwembe jangwa almasi kiboko farasi ngamia kasuku buibui nyeupe nyeusi kijani darasa hesabu kanisa harusi zawadi hasara tajiri hodari shujaa jasiri hasira huzuni kijana kizazi kabila hekima kimbia tembea safiri fikiri shinda fungua sukuma tafuta maliza subiri kisima jahazi kilele ukungu mwanga mganga mtungi nyundo daraja uwanja hoteli chumba jikoni gazeti mchezo karata afrika kusoma kupika kulala kuamka kwenda kusema kutaka kupata kuomba kuruka kuimba kunywa mbinu sababu mwisho mwanzo kiongozi
chakula nyumba kitenge suruali kijiji serikali mwalimu daktari mkulima ushindi heshima dirisha kitanda kikombe kijiko sufuria zamani asubuhi kushoto hapana lakini kwaheri samahani hongera mahindi mchanga dhahabu nguruwe sungura kipepeo nyekundu kahawia mtihani historia sayansi msikiti sikukuu sherehe biashara mshahara maskini kicheko tabasamu mapenzi hadithi methali kumbuka pumzika zungumza bandari kiwanja nyumbani ghorofa runinga filamu bendera kucheza kupenda kufanya kucheka kuandika msumari sindano sanduku maharage theluji bunduki mvinyo kitambaa kioo
pasi kuni lami mpaka bara kipaji sifa tuzo kombe bingwa nyimbo fumbo neno maneno herufi akiba hazina mali bure ghafla polepole mwenzi mpenzi wanyama mnyama mimea mbingu nuru kisiwa kisasa ogelea kitendawili
`


// ---------- v2 additions (append-only: new words go at the END so existing daily words never shift) ----------
const RAW2 = `
mjukuu binamu shangazi msichana mvulana mwanamke mwanaume wazazi wageni mwenyeji mtumishi kiongozi mfalme malkia polisi mwizi hakimu wakili mwandishi msanii mwimbaji mchezaji seremala mfugaji mchungaji muuguzi mhudumu karani mhasibu katibu rais waziri mbunge diwani jamaa mchumba yatima mama baba kaka dada bibi babu
uso macho masikio midomo jino shingo bega mikono kidole vidole kiganja kifua mgongo kiuno miguu goti kisigino ndevu figo mapafu ubongo mfupa mifupa jasho machozi pumzi kidonda maumivu kucha kope nyusi
sebule sakafu ngazi godoro shuka blanketi kabati rafu kioo feni friji bakuli birika mkaa sabuni taulo mswaki kitana mkeka zulia pazia ufunguo kufuli kengele dari ukuta mlango
chapati maandazi vitumbua jibini yai mayai mbaazi kunde njegere choroko mchicha kabichi karoti kitunguu vitunguu pilipili tangawizi mdalasini iliki chumvi mafuta mtindi matunda maembe chungwa machungwa limau ndimu tikiti zabibu tufaha fenesi stafeli pera korosho karanga muhogo unga supu mchuzi sambusa chipsi mishkaki bajia kashata halua biriani mtama ulezi
duma fisi mbweha sungura swala nyati kondoo farasi ngamia kifaru chatu mjusi kasa chura nyangumi pomboo kaa ndege bata njiwa tai mwewe kunguru bundi mbuni nyuki mbu chawa kunguni mchwa siafu nge panzi nzige konokono tumbili nyani sokwe ngiri digidigi kwale nguruwe paka mbwa panya
anga mbingu wingu mawingu dhoruba radi umeme barafu umande kilima bonde ufukwe msitu pori miti tawi majani mzizi nyasi udongo mwamba pango chemchemi kisima ardhi mvua jua mwezi nyota
juzi alfajiri dakika sekunde karne baadaye mapema mara wakati msimu kiangazi masika vuli jumatatu jumanne jumatano alhamisi ijumaa jumamosi jumapili
moja mbili nne ishirini arobaini hamsini sitini sabini themanini tisini milioni
rangi nyekundu nyeupe nyeusi kijani njano bluu zambarau kahawia kijivu waridi
nene embamba pana kale tamu chungu chachu laini gumu ghali mvivu mjanja mpole mkali mwoga mzima mgonjwa wazi tupu kamili sawa tofauti muhimu hatari salama mrefu mfupi mzuri mbaya
enda kuja fika ondoka ingia simama keti amka kula kunywa vua nunua pokea chukua beba toa acha anza endelea subiri saidia fanya jenga vunja funga fungua andika ona tazama angalia sema ongea uliza imba cheza cheka penda chukia taka hitaji fikiri kumbuka sahau elewa fundisha shinda poteza tafuta pata kimbia tembea ruka ogelea panda shuka piga vuta sukuma tupa okota kamata ficha onyesha gusa nusa onja lamba tafuna pumua kohoa tabasamu kumbatia salimia karibisha aga safiri hama lima vuna chuma chunga hesabu pima chora shona pamba safisha tengeneza washa zima choma chemsha kaanga oka changanya mimina jaza mwaga lala oga osha pika soma sikia jibu andaa kubali kataa amini ongeza punguza pumzika
amani tumaini wazo busara maarifa ujuzi mkopo utajiri haki sheria juhudi bidii subira adabu aibu kiburi wivu ukweli siri ujumbe tatizo mpango lengo michezo burudani msiba kifo uhai maisha mshindi ushindi zawadi tuzo
mji jiji mtaa barabara daraja hospitali chuo hekalu kituo mgahawa bustani kiwanda gereza mahakama maktaba posta sokoni
daladala bajaji pikipiki baiskeli teksi lori tairi injini abiria nauli tiketi ngalawa mtumbwi nanga
gauni sketi koti sweta kaptura viatu soksi kikoi kanzu baibui mkanda pete mkufu hereni miwani pochi
daftari penseli ubao chaki alama jiografia sentensi shairi kompyuta mtandao picha video mwanafunzi
mpira goli bao timu mechi refa kocha gitaa filimbi marimba muziki dansi bendi ngoma
hapa pale huko kule lini wapi nani nini gani vipi kama hata pamoja peke ndiyo
nyuki asali nta jani ua maua mbegu mavuno shamba jembe panga shoka
kalenda ramani sindano kitufe sanduku kikapu beseni jagi glasi chujio mwiko kinu mchi kibiriti mshumaa tochi betri chaja waya
kaskazini kusini mashariki magharibi wimbi mawimbi kokoto ukame mafuriko tetemeko volkano tufani
furahi ogopa kasirika shangaa kosa sahihi
sarafu noti punguzo mteja wateja bidhaa huduma ajira kampuni mradi mkataba ripoti mkutano ratiba
kliniki kidonge vidonge chanjo malaria mafua kikohozi uzima
programu tovuti akaunti nenosiri
amua chagua jaribu shiriki alika tembelea zunguka geuka pinda nyoosha inua shusha bandika ondoa linda okoa pakua pakia zuia ruhusu sifu shukuru sali funza lea oa tunza lisha
ndovu kongoni pofu nyumbu nguchiro kakakuona kenge kinyonga nondo jongoo
ukwaju bungo topetope dafu madafu
insha jaribio zoezi mazoezi wanafunzi likizo muhula
mahari tamasha taarab bongo shwari mambo jambo
`

export const LEXICON: string[] = Array.from(
  new Set((RAW + ' ' + RAW2).split(/\s+/).map(w => w.trim().toLowerCase()).filter(w => /^[a-z]{3,9}$/.test(w)))
)
export const LEXSET = new Set(LEXICON)

// ---------- FUMBUA (5-letter daily word) ----------
export const FUMBUA_ANSWERS = LEXICON.filter(w => w.length === 5)
/**
 * The daily word is picked by position, so a bigger list would change past and current days.
 * Each era fixes how many answers were in the pool from that day on. When you add words,
 * append them (never insert) and add a new era starting tomorrow.
 */
export const FUMBUA_ERAS: { fromDay: number; size: number }[] = [
  { fromDay: 0, size: 167 },
  { fromDay: 315, size: Infinity }, // 2026-11-12: dictionary v2
]

// ---------- MAFUMBO (crossword) word + Swahili clue ----------
export const CLUES: Record<string, string> = {
  simba: 'Mfalme wa pori', tembo: 'Mnyama mkubwa mwenye mkonga', twiga: 'Mwenye shingo ndefu kuliko wote',
  kiboko: 'Hulala majini mchana, hula nyasi usiku', ngamia: 'Meli ya jangwani', punda: 'Hubeba mizigo, hulia "hii-hoo"',
  nyoka: 'Hutambaa bila miguu', kasuku: 'Ndege anayeiga sauti za watu', mamba: 'Mnyama hatari wa mtoni mwenye meno mengi',
  pweza: 'Ana mikono minane baharini', samaki: 'Huogelea, hupikwa na wali pwani', nyuki: 'Hutengeneza asali',
  asali: 'Tamu inayotengenezwa na nyuki', njiwa: 'Ndege wa amani', kipepeo: 'Mdudu mwenye mabawa ya rangi',
  ugali: 'Chakula kikuu kutoka unga wa mahindi', pilau: 'Wali wenye viungo, sherehe hupenda', chai: 'Kinywaji cha moto cha asubuhi',
  kahawa: 'Kinywaji kichungu cha Kilimanjaro', ndizi: 'Tunda refu la njano', nanasi: 'Tunda lenye miiba na taji',
  embe: 'Tunda la msimu wa joto', nazi: 'Tunda la mnazi lenye maji', sukari: 'Huongeza utamu kwenye chai',
  mkate: 'Huokwa, huliwa na siagi', chakula: 'Tunachokula kila siku', mchele: 'Hupikwa kuwa wali',
  bahari: 'Maji mengi ya chumvi, Hindi ni mfano', ziwa: 'Victoria ni mfano wake', mto: 'Maji yanayotiririka, mfano Rufiji',
  mlima: 'Kilimanjaro ni mfano wake', jangwa: 'Mahali pa mchanga na ukame', kisiwa: 'Ardhi iliyozungukwa na maji, kama Unguja',
  pwani: 'Ufukwe wa bahari', jua: 'Huchomoza mashariki', mwezi: 'Huangaza usiku, siku thelathini', nyota: 'Hung\'aa angani usiku',
  mvua: 'Maji kutoka mawinguni', upepo: 'Hewa inayovuma', theluji: 'Barafu juu ya kilele cha Kibo',
  shule: 'Wanafunzi hujifunza hapa', mwalimu: 'Hufundisha darasani', daktari: 'Hutibu wagonjwa', kalamu: 'Chombo cha kuandikia',
  kitabu: 'Una kurasa nyingi za kusoma', darasa: 'Chumba cha masomo', mtihani: 'Hupima ulichojifunza',
  rafiki: 'Mwandani wako wa karibu', furaha: 'Hali ya moyo kufurahi', upendo: 'Hisia kuu ya moyoni', amani: 'Hali bila vita',
  uhuru: 'Tanganyika ilipata mwaka 1961', umoja: '___ ni nguvu, utengano ni udhaifu', hekima: 'Busara ya wazee',
  safari: 'Neno la Kiswahili lililoenea duniani', karibu: 'Neno la kumkaribisha mgeni', asante: 'Shukrani',
  jambo: 'Salamu maarufu kwa watalii', hodi: 'Husemwa mlangoni kabla ya kuingia', kwaheri: 'Neno la kuagana',
  nyumba: 'Mahali pa kuishi', mlango: 'Huingia kupitia hapa', dirisha: 'Huruhusu mwanga kuingia', kitanda: 'Hulala juu yake',
  meza: 'Huwekea sahani juu yake', kiti: 'Hukaliwa', sahani: 'Hupakulia chakula', kikombe: 'Hunywea chai',
  gari: 'Lina magurudumu manne', meli: 'Chombo kikubwa baharini', treni: 'Hupita kwenye reli', jahazi: 'Chombo cha tanga cha pwani',
  ngoma: 'Hupigwa kwenye sherehe', wimbo: 'Huimbwa', mpira: 'Huchezwa uwanjani', simu: 'Hupiga na kupokea',
  moto: 'Huwaka na kuchoma', maji: 'Uhai wa viumbe vyote', damu: 'Nyekundu, hupita mishipani', moyo: 'Hupiga ndani ya kifua',
  jicho: 'Huona', sikio: 'Husikia', mkono: 'Una vidole vitano', mguu: 'Hutembea nao', meno: 'Hutafuna chakula',
  ulimi: 'Huonja ladha', nywele: 'Huota kichwani', kichwa: 'Juu ya shingo',
  dhahabu: 'Madini ya njano yenye thamani', almasi: 'Jiwe linalong\'aa sana', fedha: 'Pesa au madini meupe',
  pesa: 'Hununulia vitu', soko: 'Kariakoo ni mfano', duka: 'Huuza bidhaa', benki: 'Huhifadhi pesa',
  kesho: 'Siku baada ya leo', jana: 'Siku kabla ya leo', usiku: 'Kinyume cha mchana', asubuhi: 'Mwanzo wa siku',
  jioni: 'Jua linapozama', haraka: '___ haraka haina baraka', polepole: 'Ndio mwendo', bahati: 'Kupata bila kutarajia',
  shamba: 'Mahali pa kulima', jembe: 'Chombo cha mkulima', mbegu: 'Hupandwa ardhini', mahindi: 'Hutoa unga wa ugali',
  mkulima: 'Hulima shamba', mvuvi: 'Huvua samaki', fundi: 'Mtaalamu wa kutengeneza vitu', askari: 'Hulinda usalama',
  mpishi: 'Hupika chakula', dereva: 'Huendesha gari', tajiri: 'Mwenye mali nyingi', maskini: 'Asiye na mali',
  harusi: 'Sherehe ya ndoa', zawadi: 'Hutolewa bila malipo', sikukuu: 'Siku ya kusherehekea', kanga: 'Vazi lenye methali',
  kofia: 'Huvaliwa kichwani', kiatu: 'Huvaliwa mguuni', shati: 'Vazi la juu lenye vifungo', kitenge: 'Kitambaa cha rangi za Afrika',
  rangi: 'Nyekundu, kijani au bluu', kijani: 'Rangi ya majani', njano: 'Rangi ya ndizi iliyoiva', nyeusi: 'Rangi ya giza',
  neno: 'Herufi zikiungana', lugha: 'Kiswahili ni mojawapo', methali: 'Usipoziba ufa utajenga ukuta, ni mfano', hadithi: 'Huanza "Paukwa..."',
  ndoto: 'Huiona ukilala', akili: 'Hufikiri', swali: 'Hujibiwa', jibu: 'Hutolewa kwa swali',
  kimbia: 'Enda kwa kasi sana', cheza: 'Fanya mchezo', cheka: 'Ha ha ha!', soma: 'Pitia maandishi', imba: 'Toa wimbo',
  pika: 'Andaa chakula jikoni', lala: 'Pumzika usiku', ruka: 'Panda hewani kwa miguu', ogelea: 'Enda majini kwa mikono na miguu',
  kubwa: 'Kinyume cha ndogo', ndogo: 'Kinyume cha kubwa', nzuri: 'Kinyume cha mbaya', safi: 'Bila uchafu', mpya: 'Kinyume cha zamani',
  refu: 'Kinyume cha fupi', baridi: 'Kinyume cha joto', kweli: 'Kinyume cha uongo', mbele: 'Kinyume cha nyuma',
  juu: 'Kinyume cha chini', ndani: 'Kinyume cha nje', bingwa: 'Mshindi wa mashindano', kombe: 'Hupewa bingwa',
  taji: 'Huvaliwa na mfalme', bendera: 'Ina rangi za taifa', taifa: 'Nchi na watu wake', hazina: 'Mali iliyofichwa',
  fumbo: 'Kitendawili kigumu', radi: 'Mlio baada ya umeme angani', umeme: 'Huwasha taa', giza: 'Hakuna mwanga',
}

// ---------- v2 clues ----------
Object.assign(CLUES, {
  mjukuu: 'Mtoto wa mtoto wako', binamu: 'Mtoto wa mjomba au shangazi', shangazi: 'Dada wa baba', msichana: 'Mtoto wa kike',
  mvulana: 'Mtoto wa kiume', mfalme: 'Huvaa taji, huongoza ufalme', malkia: 'Mke wa mfalme', polisi: 'Hulinda sheria barabarani',
  mwizi: 'Huchukua kisicho chake', hakimu: 'Huamua kesi mahakamani', wakili: 'Humtetea mshtakiwa', seremala: 'Fundi wa mbao',
  muuguzi: 'Humsaidia daktari kuuguza', rais: 'Kiongozi mkuu wa nchi', waziri: 'Huongoza wizara', mbunge: 'Hutunga sheria bungeni',
  uso: 'Sehemu ya mbele ya kichwa', macho: 'Tunaona kwayo (wingi)', jino: 'Moja ya meno', shingo: 'Huunganisha kichwa na mwili',
  bega: 'Juu ya mkono, chini ya shingo', kidole: 'Mkono una vitano', goti: 'Hukunjwa katikati ya mguu', ndevu: 'Nywele za kidevuni',
  figo: 'Husafisha damu mwilini', jasho: 'Hutoka ukifanya kazi juani', machozi: 'Hutoka ukilia', ubongo: 'Hufikiri — jina la mchezo huu!',
  kucha: 'Hukatwa vidoleni', sakafu: 'Tunakanyaga ndani ya nyumba', ngazi: 'Hupandwa kwenda ghorofani', godoro: 'Hulaliwa juu ya kitanda',
  kabati: 'Huhifadhi nguo', kioo: 'Hujitazama ndani yake', friji: 'Huhifadhi vyakula baridi', sabuni: 'Huondoa uchafu ikiwa na maji',
  taulo: 'Hujifuta baada ya kuoga', mswaki: 'Husafisha meno', ufunguo: 'Hufungua kufuli', kengele: 'Hulia shuleni muda ukiisha',
  chapati: 'Mkate wa kukaangwa, wa mviringo', jibini: 'Hutengenezwa kwa maziwa', mayai: 'Kuku hutaga', kabichi: 'Mboga ya majani yaliyobanana',
  karoti: 'Mboga ya rangi ya chungwa', pilipili: 'Huwasha mdomoni', chumvi: 'Hutoka baharini, huongeza ladha', mafuta: 'Hupikia chips',
  limau: 'Tunda chachu la njano', zabibu: 'Hutoa mvinyo', korosho: 'Hulimwa sana Mtwara', karanga: 'Hutoa siagi ya karanga',
  muhogo: 'Mzizi unaoliwa kwa chai', supu: 'Mchuzi wa moto wa asubuhi', sambusa: 'Pembetatu yenye nyama ndani', chipsi: 'Viazi vya kukaanga',
  mishkaki: 'Nyama ya kuchoma kwenye kijiti', biriani: 'Wali wenye viungo na nyama', duma: 'Mnyama mwenye kasi kuliko wote',
  fisi: 'Hucheka usiku, hula mizoga', sungura: 'Mjanja wa hadithi za Kiswahili', nyati: 'Ng’ombe mkali wa porini', kondoo: 'Hutoa sufu',
  chatu: 'Nyoka mkubwa anayebana', mjusi: 'Hutembea ukutani', chura: 'Huruka na kulia mvua ikinyesha', nyangumi: 'Mnyama mkubwa zaidi baharini',
  pomboo: 'Samaki mwerevu anayeruka majini', kunguru: 'Ndege mweusi wa mjini', bundi: 'Ndege wa usiku', mbuni: 'Ndege mkubwa asiyeruka',
  siafu: 'Wadudu wanaouma kwa msafara', nzige: 'Hula mazao kwa makundi', konokono: 'Hutembea na nyumba mgongoni', sokwe: 'Nyani mkubwa mwenye akili',
  kinyonga: 'Hubadilisha rangi', nyumbu: 'Huhama Serengeti kwa mamilioni', anga: 'Juu yetu, ni bluu mchana', wingu: 'Huleta mvua',
  dhoruba: 'Upepo mkali na mvua', barafu: 'Maji yaliyoganda', umande: 'Matone ya asubuhi kwenye nyasi', kilima: 'Mlima mdogo',
  msitu: 'Miti mingi pamoja', pango: 'Shimo kubwa mlimani', udongo: 'Hupandwa mimea ndani yake', kisima: 'Huchotwa maji ardhini',
  alfajiri: 'Kabla jua halijachomoza', dakika: 'Sekunde sitini', karne: 'Miaka mia moja', masika: 'Msimu wa mvua nyingi',
  ijumaa: 'Siku ya sala kuu kwa Waislamu', jumapili: 'Siku ya mwisho ya wiki', ishirini: 'Kumi mara mbili', hamsini: 'Nusu ya mia',
  milioni: 'Elfu elfu', zambarau: 'Rangi ya biringanya', kijivu: 'Rangi ya majivu', waridi: 'Rangi ya ua la waridi',
  tamu: 'Ladha ya sukari', chungu: 'Ladha ya dawa', laini: 'Kinyume cha gumu', mvivu: 'Hapendi kufanya kazi', mpole: 'Kinyume cha mkali',
  mgonjwa: 'Yuko hospitalini', salama: 'Bila hatari', hatari: 'Kinyume cha salama', ondoka: 'Kinyume cha fika',
  nunua: 'Lipa upate kitu', andika: 'Tumia kalamu', fikiri: 'Tumia akili', sahau: 'Kinyume cha kumbuka', shinda: 'Kinyume cha poteza',
  tafuta: 'Jaribu kupata', ogelea: 'Enda majini kwa mikono', tabasamu: 'Cheko la kimya', safiri: 'Enda mbali', vuna: 'Chukua mazao shambani',
  shona: 'Tumia sindano na uzi', chemsha: 'Pasha maji hadi yatokote', tumaini: 'Kuamini kesho itakuwa nzuri', busara: 'Hekima ya kuamua vizuri',
  haki: 'Kila mtu apate stahili yake', sheria: 'Kanuni za nchi', subira: 'Huvuta heri', siri: 'Hakuna anayejua isipokuwa wewe',
  daraja: 'Huvuka mto juu yake', bustani: 'Mahali pa maua', maktaba: 'Vitabu vingi vya kuazima',
  daladala: 'Basi dogo la abiria Dar', bajaji: 'Gari la magurudumu matatu', pikipiki: 'Boda boda', baiskeli: 'Huendeshwa kwa pedali',
  nauli: 'Hulipwa kupanda daladala', abiria: 'Husafiri ndani ya basi', gauni: 'Vazi refu la kike', viatu: 'Huvaliwa miguuni (wingi)',
  pete: 'Huvaliwa kidoleni', miwani: 'Husaidia kuona vizuri', daftari: 'Huandikia shuleni', ubao: 'Mwalimu huandika juu yake kwa chaki',
  shairi: 'Lina vina na mizani', kompyuta: 'Mashine ya kuchakata data', goli: 'Mpira huingia hapa', refa: 'Hupuliza filimbi uwanjani',
  gitaa: 'Ala ya muziki yenye nyuzi', filimbi: 'Hupulizwa, hutoa sauti', ramani: 'Huonyesha njia na nchi', mshumaa: 'Huwaka umeme ukikatika',
  ukame: 'Muda mrefu bila mvua', tetemeko: 'Ardhi ikitikisika', mteja: 'Hununua dukani',
  chanjo: 'Hukinga magonjwa', malaria: 'Huletwa na mbu', tovuti: 'Ukurasa kwenye mtandao', nenosiri: 'Neno la siri la kuingia',
  kenge: 'Mjusi mkubwa wa mtoni', insha: 'Huandikwa darasani kwa aya', likizo: 'Muda wa kupumzika bila shule', mahari: 'Hulipwa kabla ya harusi',
  taarab: 'Muziki maarufu wa Unguja', shwari: 'Bahari tulivu, au hali poa', ukwaju: 'Tunda chachu la kutengenezea juisi',
})

// ---------- WINDO letter weights (approximate Swahili frequency) ----------
export const LETTER_WEIGHTS: [string, number][] = [
  ['a', 17], ['i', 10], ['u', 7], ['e', 4], ['o', 4], ['m', 6], ['n', 7], ['k', 6], ['w', 4], ['t', 4],
  ['h', 3], ['l', 3], ['s', 3], ['y', 3], ['z', 2], ['b', 2], ['d', 2], ['j', 2], ['g', 1.5], ['f', 1.5],
  ['p', 2], ['r', 2], ['c', 0.6], ['v', 0.8],
]

// Fun Swahili facts shown on loading/results
export const METHALI = [
  'Haba na haba hujaza kibaba.',
  'Bandu bandu huisha gogo.',
  'Asiyefunzwa na mamaye hufunzwa na ulimwengu.',
  'Mchelea mwana kulia hulia yeye.',
  'Penye nia pana njia.',
  'Akili ni nywele, kila mtu ana zake.',
  'Mstahimilivu hula mbivu.',
  'Kidole kimoja hakivunji chawa.',
  'Usipoziba ufa utajenga ukuta.',
  'Maji yakimwagika hayazoleki.',
]
